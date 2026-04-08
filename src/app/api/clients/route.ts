import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import { sendEmail } from '@/lib/email/resend';
import { newClientWelcomeEmail } from '@/lib/email/templates';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { createOrReuseAuthUser } from '@/lib/utils/reuse-auth-user';
import { hasAdminAccess } from '@/lib/utils/roles';
import { createClientSchema, updateClientSchema } from '@/lib/validators/client.schema';

// Función para generar contraseña por defecto (6 dígitos numéricos)
function generateDefaultPassword(): string {
  let password = '';
  for (let i = 0; i < 6; i++) {
    password += Math.floor(Math.random() * 10).toString();
  }
  return password;
}

// Función para separar nombre completo en nombre y apellido
function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName };
}

// POST - Crear cliente con perfil
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación del usuario actual
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que es admin
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!hasAdminAccess(currentProfile?.role)) {
      return NextResponse.json(
        { error: 'Solo los administradores pueden crear clientes' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createClientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
        { status: 400 }
      );
    }

    const { name, email, phone, cedula, address } = parsed.data;

    const adminClient = await createAdminClient();
    const { firstName, lastName } = splitFullName(name);
    const defaultPassword = generateDefaultPassword();

    // 1. Crear o reutilizar usuario auth (maneja emails de usuarios soft-deleted/inactivos)
    const { data: authResult, error: reuseError } = await createOrReuseAuthUser(adminClient, {
      email,
      password: defaultPassword,
      firstName,
      lastName,
    });

    if (reuseError || !authResult) {
      return NextResponse.json(
        { error: reuseError || 'Error al crear usuario de autenticación' },
        { status: 400 }
      );
    }

    // 2. Upsert profile with CLIENT role
    const { error: profileError } = await adminClient.from('profiles').upsert(
      {
        id: authResult.userId,
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
        role: 'CLIENT',
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'id',
      }
    );

    if (profileError) {
      console.error('Error creating profile:', profileError);
      if (!authResult.isReused) {
        await adminClient.auth.admin.deleteUser(authResult.userId);
      }
      return NextResponse.json({ error: 'Error al crear perfil de cliente' }, { status: 500 });
    }

    // 3. Crear o reactivar cliente vinculado al perfil
    let clientData;
    if (authResult.isReused) {
      // Check if there's an existing soft-deleted client record to reactivate
      const { data: existingClient } = await adminClient
        .from('clients')
        .select('*')
        .eq('user_id', authResult.userId)
        .single();

      if (existingClient) {
        const { data: updated, error: updateError } = await adminClient
          .from('clients')
          .update({
            name,
            email,
            phone,
            cedula: cedula || null,
            address: address || null,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingClient.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error reactivating client:', updateError);
          return NextResponse.json({ error: 'Error al reactivar cliente' }, { status: 500 });
        }
        clientData = updated;
      } else {
        // Reused user had no client record (was an admin before) — create new
        const { data: inserted, error: insertError } = await adminClient
          .from('clients')
          .insert({
            user_id: authResult.userId,
            name,
            email,
            phone,
            cedula: cedula || null,
            address: address || null,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating client:', insertError);
          return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 });
        }
        clientData = inserted;
      }
    } else {
      // Brand new user — create client record
      const { data: inserted, error: clientError } = await adminClient
        .from('clients')
        .insert({
          user_id: authResult.userId,
          name,
          email,
          phone,
          cedula: cedula || null,
          address: address || null,
        })
        .select()
        .single();

      if (clientError) {
        console.error('Error creating client:', clientError);
        await adminClient.auth.admin.deleteUser(authResult.userId);
        return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 });
      }
      clientData = inserted;
    }

    // Revalidar páginas que muestran clientes
    revalidatePath('/admin/clients');
    revalidatePath('/admin/dashboard');

    // Enviar email de bienvenida (no bloquea la respuesta)
    const { subject, html } = newClientWelcomeEmail(name, email, defaultPassword);
    sendEmail({
      to: email,
      subject,
      html,
      idempotencyKey: `welcome/${authResult.userId}/${new Date().toISOString().slice(0, 16)}`,
    }).catch((e) => console.error('[Email] Welcome email failed:', e));

    return NextResponse.json({
      success: true,
      client: clientData,
      defaultPassword,
      message: 'Cliente creado exitosamente',
    });
  } catch (error: unknown) {
    console.error('Error in POST /api/clients:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT - Actualizar cliente y sincronizar con perfil
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que es admin
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!hasAdminAccess(currentProfile?.role)) {
      return NextResponse.json(
        { error: 'Solo los administradores pueden editar clientes' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = updateClientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
        { status: 400 }
      );
    }

    const { clientId, name, email, phone, cedula, address } = parsed.data;

    const adminClient = await createAdminClient();

    // Obtener el cliente actual para saber su user_id
    const { data: existingClient, error: fetchError } = await adminClient
      .from('clients')
      .select('user_id')
      .eq('id', clientId)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Actualizar cliente
    const updateData: Record<string, string | null | undefined> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (cedula !== undefined) updateData.cedula = cedula;
    if (address !== undefined) updateData.address = address;

    const { error: clientError } = await adminClient
      .from('clients')
      .update(updateData)
      .eq('id', clientId);

    if (clientError) {
      console.error('Error updating client:', clientError);
      return NextResponse.json({ error: 'Error al actualizar cliente' }, { status: 500 });
    }

    // Si el cliente tiene un perfil asociado, sincronizar
    if (existingClient?.user_id) {
      const { firstName, lastName } = name
        ? splitFullName(name)
        : { firstName: undefined, lastName: undefined };

      const profileUpdate: Record<string, string | undefined> = {
        updated_at: new Date().toISOString(),
      };

      if (email !== undefined) profileUpdate.email = email;
      if (phone !== undefined) profileUpdate.phone = phone;
      if (firstName !== undefined) profileUpdate.first_name = firstName;
      if (lastName !== undefined) profileUpdate.last_name = lastName;

      const { error: profileError } = await adminClient
        .from('profiles')
        .update(profileUpdate)
        .eq('id', existingClient.user_id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        // No fallar, solo registrar el error
      }

      // Actualizar email en auth si cambió
      if (email !== undefined) {
        const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(
          existingClient.user_id,
          { email }
        );

        if (authUpdateError) {
          console.error('Error updating auth email:', authUpdateError);
        }
      }
    }

    // Revalidar páginas que muestran clientes
    revalidatePath('/admin/clients');
    revalidatePath(`/admin/clients/${clientId}`);
    revalidatePath('/admin/dashboard');

    return NextResponse.json({
      success: true,
      message: 'Cliente actualizado exitosamente',
    });
  } catch (error: unknown) {
    console.error('Error in PUT /api/clients:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
