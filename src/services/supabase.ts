import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';

const buildEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env || {};
const supabaseUrl = buildEnv.VITE_SUPABASE_URL || '';
const supabaseAnonKey = buildEnv.VITE_SUPABASE_ANON_KEY || '';

/**
 * The browser client is deliberately built with the publishable key only.
 * The service-role/secret key must stay in the server environment.
 */
export const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const supabaseAuthConfigured = Boolean(supabase);

export async function getSupabaseSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}
