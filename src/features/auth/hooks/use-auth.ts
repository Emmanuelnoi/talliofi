import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import { extractFactors, type MfaFactor } from '@/lib/mfa-utils';
import { mapSupabaseAuthError } from '@/lib/auth-errors';

const SESSION_BOOTSTRAP_TIMEOUT_MS = 8_000;

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

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    let fallbackTimeoutId: ReturnType<typeof setTimeout> | null = null;

    // Safety-net: if getSession() hangs beyond timeout, stop blocking the UI.
    // Normally the .finally() below resolves first and clears this timer.
    fallbackTimeoutId = setTimeout(() => {
      if (!mounted) return;
      if (import.meta.env.DEV) {
        console.warn(
          '[auth] Session bootstrap timeout reached; unblocking UI.',
        );
      }
      // Only unblock if getSession() hasn't resolved yet
      fallbackTimeoutId = null;
      setIsLoading(false);
    }, SESSION_BOOTSTRAP_TIMEOUT_MS);

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session);
        setUser(data.session?.user ?? null);
      })
      .catch((error) => {
        if (import.meta.env.DEV) {
          console.warn('[auth] Failed to bootstrap session', error);
        }
      })
      .finally(() => {
        if (fallbackTimeoutId) {
          clearTimeout(fallbackTimeoutId);
          fallbackTimeoutId = null;
        }
        if (mounted) {
          setIsLoading(false);
        }
      });

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => {
      mounted = false;
      if (fallbackTimeoutId) {
        clearTimeout(fallbackTimeoutId);
      }
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      throw new Error(
        mapSupabaseAuthError(
          error,
          'Unable to sign in. Check your credentials and try again.',
        ),
      );
    }

    if (data.session) {
      return { status: 'signed_in' } satisfies SignInResult;
    }

    const { data: factorData, error: factorError } =
      await supabase.auth.mfa.listFactors();
    if (factorError) {
      throw new Error(
        mapSupabaseAuthError(
          factorError,
          'Unable to complete sign-in. Please try again.',
        ),
      );
    }
    const factors = extractFactors(factorData);
    if (factors.length === 0) {
      throw new Error('Multi-factor authentication required.');
    }
    return { status: 'mfa_required', factors } satisfies SignInResult;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      throw new Error(
        mapSupabaseAuthError(
          error,
          'Unable to create account. Please try again.',
        ),
      );
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(
        mapSupabaseAuthError(error, 'Unable to sign out. Please try again.'),
      );
    }
  }, []);

  return { user, session, isLoading, signIn, signUp, signOut };
}
