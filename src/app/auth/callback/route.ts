import { NextResponse } from 'next/server';

import { createAdminClient, createClient } from '@/lib/supabase/server';

/**
 * Parse first/last name from Google (or other OAuth) user_metadata.
 */
function getNameFromMetadata(metadata: Record<string, unknown> | undefined): {
  first_name: string;
  last_name: string;
} {
  if (!metadata) return { first_name: 'Usuario', last_name: '' };

  const full = (metadata.full_name as string) || (metadata.name as string) || '';
  const given = (metadata.given_name as string) || '';
  const family = (metadata.family_name as string) || '';

  if (given || family) {
    return { first_name: given || 'Usuario', last_name: family };
  }
  const parts = full.trim().split(/\s+/);
  if (parts.length >= 2) {
    return { first_name: parts[0], last_name: parts.slice(1).join(' ') };
  }
  return { first_name: parts[0] || 'Usuario', last_name: '' };
}

/**
 * OAuth Callback Handler
 *
 * Handles the callback from providers like Google: exchanges the code for a session,
 * ensures the user has a profile (creates/updates for new OAuth users), then redirects.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_error`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_error`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  // New OAuth user: create or update profile with data from provider
  if (!profile) {
    const admin = await createAdminClient();
    const { first_name, last_name } = getNameFromMetadata(data.user.user_metadata);
    const email = data.user.email ?? '';

    await admin.from('profiles').upsert(
      {
        id: data.user.id,
        email,
        first_name,
        last_name,
        phone: null,
        role: 'CLIENT',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  }

  // Determine redirect from profile (after possible upsert)
  const { data: profileAfter } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  const path = profileAfter?.role === 'ADMIN' ? '/admin/dashboard' : '/client/panel';
  return NextResponse.redirect(`${origin}${path}`);
}
