import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import env from '@/env';

/**
 * Reads Supabase configuration from Vite env vars.
 * Both must be present for cloud sync to be available.
 * The app works fully in local-only mode when these are absent.
 */
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

/** Whether Supabase is configured and cloud features are available */
export const isSupabaseConfigured =
  typeof supabaseUrl === 'string' &&
  supabaseUrl.length > 0 &&
  typeof supabaseAnonKey === 'string' &&
  supabaseAnonKey.length > 0;

/**
 * The Supabase client instance, or `null` when env vars are missing.
 * Always check `isSupabaseConfigured` or guard against `null` before use.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        // Security default: avoid persistent browser token storage.
        // Can be explicitly enabled for trusted deployments.
        persistSession: env.VITE_SUPABASE_PERSIST_SESSION,
        detectSessionInUrl: true,
      },
    })
  : null;
