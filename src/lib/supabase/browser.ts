import { createBrowserClient } from '@supabase/ssr';

import { env } from '@/config/env';

/**
 * Creates a Supabase client for client-side operations
 * This is a singleton that can be used across the app
 */
export function createClient() {
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

