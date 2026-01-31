import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export type UserRole = 'ADMIN' | 'CLIENT' | null;

export interface SessionResult {
  supabaseResponse: NextResponse;
  user: { id: string; email?: string } | null;
  role: UserRole;
}

/**
 * Updates the Supabase session in middleware
 * This ensures the session stays fresh across requests
 * Also fetches the user's role for route protection
 */
export async function updateSession(request: NextRequest): Promise<SessionResult> {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as CookieOptions)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make your app very slow!
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // If there's an error or no user, return early with null user
  if (authError || !user) {
    return { supabaseResponse, user: null, role: null };
  }

  // Fetch user's role from profiles table
  let role: UserRole = null;
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role) {
      role = profile.role as UserRole;
    }
  } catch (error) {
    console.error('Error fetching user role in middleware:', error);
  }

  return { supabaseResponse, user, role };
}

