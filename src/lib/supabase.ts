import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  isSupabaseConfigured,
  supabaseUrl,
  supabaseAnonKey,
} from './supabase-config';
import env from '@/env';

// Re-export for consumers that need both client + config check
export { isSupabaseConfigured } from './supabase-config';

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
