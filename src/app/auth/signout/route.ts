import { type NextRequest, NextResponse } from 'next/server';

import { env } from '@/config/env';
import { type CookieOptions, createServerClient } from '@supabase/ssr';

/**
 * Sign-out Route Handler
 *
 * Handles sign-out server-side so the session cookie is cleared in the HTTP
 * response BEFORE the browser follows the redirect to /login. This avoids the
 * client-side race condition where the middleware sees a still-valid cookie if
 * `supabase.auth.signOut()` hangs (e.g. while holding an internal lock during
 * a concurrent token refresh).
 */
export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;
  // Create the redirect response first so we can attach cookie-clearing headers to it.
  const response = NextResponse.redirect(`${origin}/login`);

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write cookie mutations (including the session-clearing Set-Cookie header)
          // directly onto the redirect response so the browser receives them.
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as CookieOptions)
          );
        },
      },
    }
  );

  // scope: 'local' skips the network call to revoke the token server-side;
  // it only clears the session from storage (the cookie). That's all we need:
  // once the cookie is gone the middleware will not grant access to protected routes.
  await supabase.auth.signOut({ scope: 'local' });

  return response;
}
