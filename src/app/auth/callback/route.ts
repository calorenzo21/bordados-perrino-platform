import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/**
 * OAuth Callback Handler
 * 
 * This route handles the OAuth callback from providers like Google.
 * It exchanges the code for a session and redirects the user.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.user) {
      // Get user profile to determine redirect
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      const redirectTo = profile?.role === 'ADMIN' 
        ? '/admin/dashboard' 
        : '/client/panel';

      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(`${origin}/login?error=auth_error`);
}
