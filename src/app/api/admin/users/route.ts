import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import { sendEmail } from '@/lib/email/resend';
import { newAdminWelcomeEmail } from '@/lib/email/templates';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { createAdminSchema, deleteAdminSchema } from '@/lib/validators/admin.schema';

// Generar contraseña aleatoria
function generatePassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

// GET - Listar todos los administradores
export async function GET() {
  try {
    const supabase = await createClient();

    // Verificar que el usuario actual es admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (currentProfile?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Obtener todos los administradores
    const { data: admins, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, phone, created_at')
      .eq('role', 'ADMIN')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ admins });
  } catch (error) {
    console.error('Error al obtener administradores:', error);
    return NextResponse.json({ error: 'Error al obtener administradores' }, { status: 500 });
  }
}

// POST - Crear nuevo administrador
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = await createAdminClient();

    // Verificar que el usuario actual es admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (currentProfile?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createAdminSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
        { status: 400 }
      );
    }

    const { email, firstName, lastName } = parsed.data;

    // Verificar si el email ya existe
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingProfile) {
      return NextResponse.json({ error: 'Ya existe un usuario con este correo' }, { status: 400 });
    }

    // Generar contraseña por defecto
    const defaultPassword = generatePassword();

    // Crear usuario en auth usando admin client
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: defaultPassword,
      email_confirm: true, // Confirmar email automáticamente
      user_metadata: {
        first_name: firstName || 'Admin',
        last_name: lastName || '',
      },
    });

    if (authError) {
      console.error('Error al crear usuario en auth:', authError);
      return NextResponse.json(
        { error: authError.message || 'Error al crear usuario' },
        { status: 400 }
      );
    }

    // Usar UPSERT para manejar el caso donde el trigger crea el perfil y donde no
    // El trigger handle_new_user puede o no crear el perfil, así que usamos upsert
    const { error: profileError } = await adminClient.from('profiles').upsert(
      {
        id: authData.user.id,
        email,
        first_name: firstName || 'Admin',
        last_name: lastName || '',
        role: 'ADMIN',
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'id',
      }
    );

    if (profileError) {
      console.error('Error al crear/actualizar perfil:', profileError);
      // Si falla el perfil, eliminar el usuario de auth
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: 'Error al configurar perfil de administrador' },
        { status: 500 }
      );
    }

    // Revalidar páginas de configuración
    revalidatePath('/admin/settings');

    // Enviar email de bienvenida al nuevo admin (no bloquea la respuesta)
    const adminName = [firstName, lastName].filter(Boolean).join(' ') || 'Admin';
    const { subject, html } = newAdminWelcomeEmail(adminName, email, defaultPassword);
    sendEmail({
      to: email,
      subject,
      html,
      idempotencyKey: `admin-welcome/${authData.user.id}/${new Date().toISOString().slice(0, 16)}`,
    }).catch((e) => console.error('[Email] Admin welcome email failed:', e));

    return NextResponse.json({
      success: true,
      message: 'Administrador creado exitosamente',
      user: {
        id: authData.user.id,
        email,
        firstName: firstName || 'Admin',
        lastName: lastName || '',
      },
      defaultPassword,
    });
  } catch (error) {
    console.error('Error al crear administrador:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE - Eliminar administrador
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = await createAdminClient();

    // Verificar que el usuario actual es admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (currentProfile?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = deleteAdminSchema.safeParse({ id: searchParams.get('id') });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'ID inválido' },
        { status: 400 }
      );
    }

    const userId = parsed.data.id;

    // No permitir eliminarse a sí mismo
    if (userId === user.id) {
      return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta' }, { status: 400 });
    }

    // Verificar que quede al menos un admin activo después de desactivar
    const { count } = await adminClient
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'ADMIN');

    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: 'No se puede eliminar. Debe existir al menos un administrador en el sistema' },
        { status: 400 }
      );
    }

    // Soft-delete: cambiar rol a INACTIVE (preserva FKs en historial de pedidos/pagos)
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ role: 'INACTIVE', updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (profileError) {
      console.error('Error al desactivar perfil:', profileError);
      return NextResponse.json({ error: 'Error al desactivar administrador' }, { status: 500 });
    }

    // Banear usuario en Supabase Auth: no puede hacer login ni crear cuenta con ese email
    const { error: banError } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: '876600h', // ~100 años
    });

    if (banError) {
      // Rollback: restaurar rol si el ban falla
      console.error('Error al banear usuario:', banError);
      await adminClient
        .from('profiles')
        .update({ role: 'ADMIN', updated_at: new Date().toISOString() })
        .eq('id', userId);
      return NextResponse.json({ error: 'Error al desactivar administrador' }, { status: 500 });
    }

    // Revalidar páginas de configuración
    revalidatePath('/admin/settings');

    return NextResponse.json({
      success: true,
      message: 'Administrador desactivado exitosamente',
    });
  } catch (error) {
    console.error('Error al eliminar administrador:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
