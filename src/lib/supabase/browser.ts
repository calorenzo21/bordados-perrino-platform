import { env } from '@/config/env';
import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Returns a singleton Supabase client for client-side operations.
 * Safe to call from any component or hook — always returns the same instance.
 */
export function createClient() {
  if (!client) {
    client = createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }
  return client;
}
