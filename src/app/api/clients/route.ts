import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse, after } from 'next/server';

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

// Devuelve el primer mensaje de validación legible para el usuario. Los
// mensajes propios del esquema están en español; cualquier texto por defecto
// de Zod (en inglés, p.ej. "Invalid input: expected string, received null") se
// reemplaza por un genérico para no filtrarlo a la UI.
function firstValidationMessage(issues: { message?: string }[]): string {
  const msg = issues[0]?.message;
  if (!msg) return 'Datos inválidos';
  if (/^(Invalid|Expected|String must|Number must|Too |Required|Unrecognized)/i.test(msg)) {
    return 'Datos inválidos';
  }
  return msg;
}

type AdminSupabaseClient = Awaited<ReturnType<typeof createAdminClient>>;

type ProvisionResult =
  | { userId: string; isReused: boolean; defaultPassword: string }
  | { error: string; status: number };

// Crea (o reutiliza) la cuenta de Supabase Auth y su perfil CLIENT para un
// cliente con correo, y devuelve las credenciales generadas o un error con su
// status HTTP. NO toca la fila `clients`: la vinculación queda a cargo del
// llamador (al crear se inserta/reactiva; al editar se enlaza el cliente
// existente). Si falla la creación del perfil revierte el usuario recién creado.
async function provisionPortalAccount(
  adminClient: AdminSupabaseClient,
  { name, email, phone }: { name: string; email: string; phone: string | null }
): Promise<ProvisionResult> {
  const { firstName, lastName } = splitFullName(name);
  const defaultPassword = generateDefaultPassword();

  const { data: authResult, error: reuseError } = await createOrReuseAuthUser(adminClient, {
    email,
    password: defaultPassword,
    firstName,
    lastName,
  });

  if (reuseError || !authResult) {
    return { error: reuseError || 'Error al crear usuario de autenticación', status: 400 };
  }

  const { error: profileError } = await adminClient.from('profiles').upsert(
    {
      id: authResult.userId,
      email,
      first_name: firstName,
      last_name: lastName,
      phone: phone ?? null,
      role: 'CLIENT',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (profileError) {
    console.error('Error creating profile:', profileError);
    if (!authResult.isReused) {
      await adminClient.auth.admin.deleteUser(authResult.userId);
    }
    return { error: 'Error al crear perfil de cliente', status: 500 };
  }

  return { userId: authResult.userId, isReused: authResult.isReused, defaultPassword };
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
        { error: firstValidationMessage(parsed.error.issues) },
        { status: 400 }
      );
    }

    const { name, email, phone, cedula, address } = parsed.data;

    const adminClient = await createAdminClient();

    // Evitar clientes duplicados por teléfono. El teléfono es la identidad de
    // los clientes sin correo (el agente los resuelve por número) y no existe
    // un índice único sobre clients.phone, así que se valida a nivel de
    // aplicación antes de insertar. Solo bloquea contra clientes ACTIVOS.
    if (phone) {
      const { data: phoneDupe } = await adminClient
        .from('clients')
        .select('id')
        .eq('phone', phone)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (phoneDupe) {
        return NextResponse.json(
          { error: 'Ya existe un cliente activo con ese teléfono' },
          { status: 409 }
        );
      }
    }

    // ── Cliente solo con teléfono (sin correo electrónico) ──────────────
    // No se crea cuenta de Supabase Auth ni perfil: es un registro gestionado
    // por el admin, sin acceso al portal. La validación ya garantizó que haya
    // al menos un teléfono.
    if (!email) {
      const { data: inserted, error: insertError } = await adminClient
        .from('clients')
        .insert({
          user_id: null,
          name,
          email: null,
          phone: phone ?? null,
          cedula: cedula || null,
          address: address || null,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating phone-only client:', insertError);
        return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 });
      }

      revalidatePath('/admin/clients');
      revalidatePath('/admin/dashboard');

      return NextResponse.json({
        success: true,
        client: inserted,
        account: null,
        message: 'Cliente creado sin acceso al portal (sin correo electrónico)',
      });
    }

    // ── Cliente con correo: flujo completo con cuenta de Auth ───────────
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
        phone: phone ?? null,
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
            phone: phone ?? null,
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
            phone: phone ?? null,
            cedula: cedula || null,
            address: address || null,
            is_active: true,
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
          phone: phone ?? null,
          cedula: cedula || null,
          address: address || null,
          is_active: true,
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

    // Enviar email de bienvenida después de responder. `after()` garantiza que
    // este trabajo asíncrono se ejecute en entornos serverless (Vercel), donde
    // una promesa sin await se cancelaría al terminar la respuesta HTTP.
    const { subject, html } = newClientWelcomeEmail(name, email, defaultPassword);
    after(async () => {
      try {
        await sendEmail({
          to: email,
          subject,
          html,
          idempotencyKey: `welcome/${authResult.userId}/${new Date().toISOString().slice(0, 16)}`,
        });
      } catch (e) {
        console.error('[Email] Welcome email failed:', e);
      }
    });

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
        { error: firstValidationMessage(parsed.error.issues) },
        { status: 400 }
      );
    }

    const { clientId, name, email, phone, cedula, address } = parsed.data;

    const adminClient = await createAdminClient();

    // Obtener el cliente actual (user_id para saber si ya tiene cuenta de portal;
    // name/phone como respaldo al provisionar si el payload no los incluye).
    const { data: existingClient, error: fetchError } = await adminClient
      .from('clients')
      .select('user_id, name, phone')
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

    // Upgrade solo-teléfono → portal: si un cliente sin cuenta (user_id null)
    // recibe un correo, se provisiona ahora su acceso al portal (usuario de Auth
    // + perfil), se enlaza a este cliente y se le envía la bienvenida con una
    // contraseña temporal. Así "agregar correo" otorga acceso de forma
    // consistente con la creación de clientes con correo.
    let provisionedUserId: string | null = null;
    let provisionedPassword: string | null = null;
    let provisionedIsReused = false;
    if (!existingClient?.user_id && email) {
      // No enlazar un correo que ya pertenece a otra cuenta (evita duplicados).
      const { data: emailOwner } = await adminClient
        .from('profiles')
        .select('id')
        .eq('email', email)
        .limit(1)
        .maybeSingle();

      if (emailOwner) {
        return NextResponse.json(
          { error: 'Ese correo ya está en uso por otra cuenta. Usa un correo distinto.' },
          { status: 409 }
        );
      }

      const provision = await provisionPortalAccount(adminClient, {
        name: name ?? existingClient?.name ?? '',
        email,
        phone: phone ?? existingClient?.phone ?? null,
      });

      if ('error' in provision) {
        return NextResponse.json({ error: provision.error }, { status: provision.status });
      }

      provisionedUserId = provision.userId;
      provisionedPassword = provision.defaultPassword;
      provisionedIsReused = provision.isReused;
      updateData.user_id = provision.userId; // enlazar el cliente con la nueva cuenta
    }

    const { error: clientError } = await adminClient
      .from('clients')
      .update(updateData)
      .eq('id', clientId);

    if (clientError) {
      console.error('Error updating client:', clientError);
      // Revertir la cuenta recién creada para no dejar un usuario huérfano. Solo
      // si fue una cuenta NUEVA: si se hubiera reutilizado una preexistente, no
      // debe borrarse (hoy el pre-chequeo de email hace inalcanzable el reuse,
      // pero la guarda mantiene correcto el rollback si eso cambiara).
      if (provisionedUserId && !provisionedIsReused) {
        await adminClient.auth.admin.deleteUser(provisionedUserId);
      }
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

    // Enviar correo de bienvenida si se acaba de crear el acceso al portal.
    if (provisionedUserId && provisionedPassword) {
      const welcomeName = name ?? existingClient?.name ?? '';
      const welcomeEmail = email as string;
      const welcomeUserId = provisionedUserId;
      const welcomePassword = provisionedPassword;
      const { subject, html } = newClientWelcomeEmail(welcomeName, welcomeEmail, welcomePassword);
      after(async () => {
        try {
          await sendEmail({
            to: welcomeEmail,
            subject,
            html,
            idempotencyKey: `welcome/${welcomeUserId}/${new Date().toISOString().slice(0, 16)}`,
          });
        } catch (e) {
          console.error('[Email] Welcome email failed:', e);
        }
      });
    }

    // Revalidar páginas que muestran clientes
    revalidatePath('/admin/clients');
    revalidatePath(`/admin/clients/${clientId}`);
    revalidatePath('/admin/dashboard');

    return NextResponse.json({
      success: true,
      message: provisionedPassword
        ? 'Cliente actualizado y acceso al portal creado'
        : 'Cliente actualizado exitosamente',
      // `email` ya viene normalizado (minúsculas) por el esquema, para que las
      // credenciales mostradas coincidan exactamente con las de inicio de sesión.
      account: provisionedPassword ? { defaultPassword: provisionedPassword, email } : null,
    });
  } catch (error: unknown) {
    console.error('Error in PUT /api/clients:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
