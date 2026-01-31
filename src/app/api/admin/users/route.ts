import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

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
    const { data: { user } } = await supabase.auth.getUser();
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
    return NextResponse.json(
      { error: 'Error al obtener administradores' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo administrador
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = await createAdminClient();
    
    // Verificar que el usuario actual es admin
    const { data: { user } } = await supabase.auth.getUser();
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
    const { email, firstName, lastName } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email es requerido' }, { status: 400 });
    }

    // Verificar si el email ya existe
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingProfile) {
      return NextResponse.json(
        { error: 'Ya existe un usuario con este correo' },
        { status: 400 }
      );
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
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email,
        first_name: firstName || 'Admin',
        last_name: lastName || '',
        role: 'ADMIN',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      });

    if (profileError) {
      console.error('Error al crear/actualizar perfil:', profileError);
      // Si falla el perfil, eliminar el usuario de auth
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: 'Error al configurar perfil de administrador' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Administrador creado exitosamente',
      user: {
        id: authData.user.id,
        email,
        firstName: firstName || 'Admin',
        lastName: lastName || '',
      },
      defaultPassword, // Enviar la contraseña generada para que se la compartan al nuevo admin
    });
  } catch (error) {
    console.error('Error al crear administrador:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar administrador
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = await createAdminClient();
    
    // Verificar que el usuario actual es admin
    const { data: { user } } = await supabase.auth.getUser();
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
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });
    }

    // No permitir eliminarse a sí mismo
    if (userId === user.id) {
      return NextResponse.json(
        { error: 'No puedes eliminar tu propia cuenta' },
        { status: 400 }
      );
    }

    // Eliminar perfil
    const { error: profileError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('Error al eliminar perfil:', profileError);
    }

    // Eliminar usuario de auth
    const { error: authError } = await adminClient.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('Error al eliminar usuario:', authError);
      return NextResponse.json(
        { error: 'Error al eliminar administrador' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Administrador eliminado exitosamente',
    });
  } catch (error) {
    console.error('Error al eliminar administrador:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
