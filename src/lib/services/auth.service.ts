/**
 * Auth Service
 * 
 * Business logic for authentication operations.
 * Handles sign up, sign in, sign out, and user profile management.
 */

import { SupabaseClient, User } from '@supabase/supabase-js';

import type { Profile, SignUpData, SignInData, AuthUser, UserRole } from '@/lib/types/database';

export class AuthService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Sign up a new user
   */
  async signUp(data: SignUpData): Promise<{ user: User | null; error: string | null }> {
    const { email, password, firstName, lastName, phone } = data;

    const { data: authData, error: authError } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone: phone || null,
          role: 'CLIENT' as UserRole,
        },
      },
    });

    if (authError) {
      return { user: null, error: this.getErrorMessage(authError.message) };
    }

    return { user: authData.user, error: null };
  }

  /**
   * Sign in an existing user
   */
  async signIn(data: SignInData): Promise<{ user: User | null; error: string | null }> {
    const { email, password } = data;

    const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return { user: null, error: this.getErrorMessage(authError.message) };
    }

    return { user: authData.user, error: null };
  }

  /**
   * Sign in with Google OAuth
   */
  async signInWithGoogle(): Promise<{ url: string | null; error: string | null }> {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
      },
    });

    if (error) {
      return { url: null, error: this.getErrorMessage(error.message) };
    }

    return { url: data.url, error: null };
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<{ error: string | null }> {
    const { error } = await this.supabase.auth.signOut();
    
    if (error) {
      return { error: this.getErrorMessage(error.message) };
    }

    return { error: null };
  }

  /**
   * Get the current authenticated user with profile
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    const { data: { user }, error } = await this.supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    // Fetch the profile
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return {
      id: user.id,
      email: user.email || '',
      profile: profile || null,
    };
  }

  /**
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) return null;
    return data;
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updates: Partial<Pick<Profile, 'first_name' | 'last_name' | 'phone'>>
  ): Promise<{ profile: Profile | null; error: string | null }> {
    const { data, error } = await this.supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return { profile: null, error: error.message };
    }

    return { profile: data, error: null };
  }

  /**
   * Check if user is admin
   */
  async isAdmin(userId?: string): Promise<boolean> {
    if (!userId) {
      const user = await this.getCurrentUser();
      if (!user) return false;
      userId = user.id;
    }

    const profile = await this.getProfile(userId);
    return profile?.role === 'ADMIN';
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/reset-password`,
    });

    if (error) {
      return { error: this.getErrorMessage(error.message) };
    }

    return { error: null };
  }

  /**
   * Update password
   */
  async updatePassword(newPassword: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { error: this.getErrorMessage(error.message) };
    }

    return { error: null };
  }

  /**
   * Translate error messages to Spanish
   */
  private getErrorMessage(message: string): string {
    const errorMap: Record<string, string> = {
      'Invalid login credentials': 'Credenciales inválidas. Verifica tu correo y contraseña.',
      'Email not confirmed': 'Por favor confirma tu correo electrónico antes de iniciar sesión.',
      'User already registered': 'Este correo electrónico ya está registrado.',
      'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
      'Signup requires a valid password': 'Se requiere una contraseña válida.',
      'Unable to validate email address: invalid format': 'El formato del correo electrónico no es válido.',
      'Email rate limit exceeded': 'Demasiados intentos. Intenta de nuevo más tarde.',
    };

    return errorMap[message] || message;
  }
}
