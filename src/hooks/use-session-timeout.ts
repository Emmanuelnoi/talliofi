import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useSyncStore } from '@/stores/sync-store';

/** Inactivity timeout in milliseconds (15 minutes) */
const TIMEOUT_MS = 15 * 60 * 1000;

/** Warning shown 1 minute before timeout */
const WARNING_MS = TIMEOUT_MS - 60 * 1000;

/** Events that count as user activity */
const ACTIVITY_EVENTS: readonly string[] = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
] as const;

/**
 * Monitors user activity and signs the user out of Supabase
 * after 15 minutes of inactivity. Only active when cloud sync
 * mode is enabled and the user is authenticated.
 *
 * Shows a toast warning 1 minute before the session expires.
 * Any user activity resets the timer.
 */
export function useSessionTimeout(): void {
  const { user } = useAuth();
  const storageMode = useSyncStore((s) => s.storageMode);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningShownRef = useRef(false);

  const isActive = isSupabaseConfigured && storageMode === 'cloud' && !!user;

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
      toast.info('Session expired due to inactivity. Please sign in again.');
    } catch {
      // Sign-out failure is non-critical; the session will expire server-side
    }
  }, []);

  const resetTimers = useCallback(() => {
    clearTimers();
    warningShownRef.current = false;

    warningRef.current = setTimeout(() => {
      warningShownRef.current = true;
      toast.warning('Session expiring in 1 minute due to inactivity...');
    }, WARNING_MS);

    timeoutRef.current = setTimeout(() => {
      void handleSignOut();
    }, TIMEOUT_MS);
  }, [clearTimers, handleSignOut]);

  useEffect(() => {
    if (!isActive) {
      clearTimers();
      return;
    }

    resetTimers();

    const handleActivity = () => {
      resetTimers();
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handleActivity, { passive: true });
    }

    return () => {
      clearTimers();
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, handleActivity);
      }
    };
  }, [isActive, resetTimers, clearTimers]);
}
