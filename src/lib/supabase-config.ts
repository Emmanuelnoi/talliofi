import env from '@/env';

/**
 * Reads Supabase configuration from Vite env vars.
 * Both must be present for cloud sync to be available.
 * The app works fully in local-only mode when these are absent.
 *
 * This module intentionally does NOT import `@supabase/supabase-js`
 * so that lightweight consumers (AuthGuard, sync-store checks) don't
 * pull the full Supabase bundle into the initial chunk.
 */
export const supabaseUrl = env.VITE_SUPABASE_URL;
export const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

/** Whether Supabase is configured and cloud features are available */
export const isSupabaseConfigured =
  typeof supabaseUrl === 'string' &&
  supabaseUrl.length > 0 &&
  typeof supabaseAnonKey === 'string' &&
  supabaseAnonKey.length > 0;
