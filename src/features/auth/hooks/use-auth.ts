import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import { extractFactors, type MfaFactor } from '@/lib/mfa-utils';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export interface SignInResult {
  status: 'signed_in' | 'mfa_required';
  factors?: MfaFactor[];
}

/**
 * Hook for managing Supabase authentication state.
 *
 * Returns `user: null` and loading false immediately when Supabase
 * is not configured, allowing the app to function in local-only mode.
 */
export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  // Start as not loading when supabase is unconfigured; avoids sync setState in effect
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const initialised = useRef(false);

  useEffect(() => {
    if (!supabase || initialised.current) return;
    initialised.current = true;

    // Fetch initial session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setIsLoading(false);
    });

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error(error.message);

    if (data.session) {
      return { status: 'signed_in' } satisfies SignInResult;
    }

    const { data: factorData, error: factorError } =
      await supabase.auth.mfa.listFactors();
    if (factorError) throw new Error(factorError.message);
    const factors = extractFactors(factorData);
    if (factors.length === 0) {
      throw new Error('Multi-factor authentication required.');
    }
    return { status: 'mfa_required', factors } satisfies SignInResult;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  }, []);

  return { user, session, isLoading, signIn, signUp, signOut };
}
