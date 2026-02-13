import { useEffect } from 'react';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useSyncStore } from '@/stores/sync-store';
import { shouldBlockCloudAuthInCurrentBuild } from '@/lib/security-controls';
import { useAuth } from '../hooks/use-auth';
import type { ReactNode } from 'react';

interface AuthGuardProps {
  children: ReactNode;
}

/**
 * Wraps protected content so that:
 * - Local-first mode always renders the app shell.
 * - Cloud mode degrades to local mode when there is no active session.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const storageMode = useSyncStore((s) => s.storageMode);
  const setStorageMode = useSyncStore((s) => s.setStorageMode);
  const { user, isLoading, signOut } = useAuth();
  const cloudAuthBlocked = shouldBlockCloudAuthInCurrentBuild();
  const isCloudMode = storageMode === 'cloud';

  useEffect(() => {
    if (!cloudAuthBlocked || !isCloudMode) return;
    setStorageMode('local');
    if (user) {
      void signOut().catch(() => {
        // Best-effort sign out when enforcing production cloud-auth block.
      });
    }
  }, [cloudAuthBlocked, isCloudMode, setStorageMode, signOut, user]);

  useEffect(() => {
    // Local-first fallback: if cloud mode is selected but no valid session
    // exists, continue in local mode instead of forcing login.
    if (!isCloudMode || !isSupabaseConfigured || isLoading || user) return;
    setStorageMode('local');
  }, [isCloudMode, isLoading, setStorageMode, user]);

  return <>{children}</>;
}
