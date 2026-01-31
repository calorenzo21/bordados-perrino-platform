'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';

export interface AuthResult {
  success: boolean;
  error?: string;
  redirectTo?: string;
}

/**
 * Sign in with email and password
 */
export async function signIn(formData: FormData): Promise<AuthResult> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, error: 'Por favor completa todos los campos' };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: getErrorMessage(error.message) };
  }

  // Get user profile to determine redirect
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  revalidatePath('/', 'layout');

  const redirectTo = profile?.role === 'ADMIN' ? '/admin/dashboard' : '/client/panel';
  
  return { success: true, redirectTo };
}

/**
 * Sign up with email and password
 */
export async function signUp(formData: FormData): Promise<AuthResult> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const phone = formData.get('phone') as string;

  if (!email || !password || !firstName || !lastName) {
    return { success: false, error: 'Por favor completa todos los campos requeridos' };
  }

  if (password.length < 6) {
    return { success: false, error: 'La contraseña debe tener al menos 6 caracteres' };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        role: 'CLIENT',
      },
    },
  });

  if (error) {
    return { success: false, error: getErrorMessage(error.message) };
  }

  // Check if email confirmation is required
  if (data.user && !data.session) {
    return { 
      success: true, 
      error: 'Te hemos enviado un correo de confirmación. Por favor revisa tu bandeja de entrada.',
    };
  }

  revalidatePath('/', 'layout');
  
  return { success: true, redirectTo: '/client/panel' };
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

/**
 * Request password reset
 */
export async function requestPasswordReset(formData: FormData): Promise<AuthResult> {
  const email = formData.get('email') as string;

  if (!email) {
    return { success: false, error: 'Por favor ingresa tu correo electrónico' };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || ''}/reset-password`,
  });

  if (error) {
    return { success: false, error: getErrorMessage(error.message) };
  }

  return { 
    success: true, 
    error: 'Te hemos enviado un correo con instrucciones para restablecer tu contraseña.',
  };
}

/**
 * Update password (after reset)
 */
export async function updatePassword(formData: FormData): Promise<AuthResult> {
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!password || !confirmPassword) {
    return { success: false, error: 'Por favor completa todos los campos' };
  }

  if (password !== confirmPassword) {
    return { success: false, error: 'Las contraseñas no coinciden' };
  }

  if (password.length < 6) {
    return { success: false, error: 'La contraseña debe tener al menos 6 caracteres' };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return { success: false, error: getErrorMessage(error.message) };
  }

  return { success: true, redirectTo: '/login' };
}

/**
 * Translate error messages to Spanish
 */
function getErrorMessage(message: string): string {
  const errorMap: Record<string, string> = {
    'Invalid login credentials': 'Credenciales inválidas. Verifica tu correo y contraseña.',
    'Email not confirmed': 'Por favor confirma tu correo electrónico antes de iniciar sesión.',
    'User already registered': 'Este correo electrónico ya está registrado.',
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
    'Signup requires a valid password': 'Se requiere una contraseña válida.',
    'Unable to validate email address: invalid format': 'El formato del correo electrónico no es válido.',
    'Email rate limit exceeded': 'Demasiados intentos. Intenta de nuevo más tarde.',
    'New password should be different from the old password': 'La nueva contraseña debe ser diferente a la anterior.',
  };

  return errorMap[message] || message;
}
