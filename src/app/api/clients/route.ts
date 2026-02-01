import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient, createClient } from '@/lib/supabase/server';

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

    if (currentProfile?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Solo los administradores pueden crear clientes' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, phone, cedula, address } = body;

    if (!name || !email || !phone) {
      return NextResponse.json(
        { error: 'Nombre, email y teléfono son requeridos' },
        { status: 400 }
      );
    }

    const adminClient = await createAdminClient();
    const { firstName, lastName } = splitFullName(name);
    const defaultPassword = generateDefaultPassword();

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: createAuthError } = await adminClient.auth.admin.createUser({
      email,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      },
    });

    if (createAuthError) {
      console.error('Error creating auth user:', createAuthError);
      return NextResponse.json(
        {
          error: createAuthError.message || 'Error al crear usuario de autenticación',
        },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'No se pudo crear el usuario' }, { status: 500 });
    }

    // 2. Crear o actualizar perfil con rol CLIENT
    const { error: profileError } = await adminClient.from('profiles').upsert(
      {
        id: authData.user.id,
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
      // Intentar eliminar el usuario auth si falla el perfil
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: 'Error al crear perfil de cliente' }, { status: 500 });
    }

    // 3. Crear cliente vinculado al perfil
    const { data: clientData, error: clientError } = await adminClient
      .from('clients')
      .insert({
        user_id: authData.user.id,
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
      // Intentar limpiar en caso de error
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 });
    }

    // Revalidar páginas que muestran clientes
    revalidatePath('/admin/clients');
    revalidatePath('/admin/dashboard');

    return NextResponse.json({
      success: true,
      client: clientData,
      defaultPassword, // Retornar la contraseña para que el admin pueda comunicarla al cliente
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

    if (currentProfile?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Solo los administradores pueden editar clientes' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { clientId, name, email, phone, cedula, address } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'ID de cliente requerido' }, { status: 400 });
    }

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
    const updateData: Record<string, string | undefined> = {
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
