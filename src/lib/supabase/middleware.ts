import { type NextRequest, NextResponse } from 'next/server';

import { env } from '@/config/env';
import { type CookieOptions, createServerClient } from '@supabase/ssr';

export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'CLIENT' | 'INACTIVE' | null;

export interface SessionResult {
  supabaseResponse: NextResponse;
  user: { id: string; email?: string } | null;
  role: UserRole;
}

const ROLE_COOKIE = 'x-user-role';
// Role cookie lifespan in seconds (1 hour). Kept short so stale roles don't persist.
const ROLE_COOKIE_MAX_AGE = 60 * 60;

/**
 * Updates the Supabase session in middleware.
 * Caches the user role in a short-lived cookie (x-user-role) to avoid hitting
 * the profiles table on every request. The role is refreshed whenever it is
 * absent or the Supabase session emits a new token (cookie mutation).
 */
export async function updateSession(request: NextRequest): Promise<SessionResult> {
  let supabaseResponse = NextResponse.next({
    request,
  });

  let sessionMutated = false;

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as CookieOptions)
          );
          // Supabase mutated auth cookies → the session changed (token refresh, new login).
          // Force a fresh role lookup so the role cookie stays in sync.
          sessionMutated = true;
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

  // If there's an error or no user, clear the role cookie and return early.
  if (authError || !user) {
    supabaseResponse.cookies.delete(ROLE_COOKIE);
    return { supabaseResponse, user: null, role: null };
  }

  // Check for a cached role cookie. Skip the DB query when:
  //   • the cookie is present, AND
  //   • the session was NOT mutated (no token refresh happened)
  const cachedRole = request.cookies.get(ROLE_COOKIE)?.value as UserRole | undefined;
  if (cachedRole && !sessionMutated) {
    return { supabaseResponse, user, role: cachedRole };
  }

  // Fetch role from DB (first visit, session refresh, or cookie missing)
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

  // Persist the role in a short-lived cookie so future requests skip the DB query.
  if (role) {
    supabaseResponse.cookies.set(ROLE_COOKIE, role, {
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      maxAge: ROLE_COOKIE_MAX_AGE,
    });
  }

  return { supabaseResponse, user, role };
}
