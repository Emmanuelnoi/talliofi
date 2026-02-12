import { Loader2 } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useSyncStore } from '@/stores/sync-store';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '../hooks/use-auth';
import { AuthForm } from './auth-form';
import type { ReactNode } from 'react';

interface AuthGuardProps {
  children: ReactNode;
}

/**
 * Wraps protected content so that:
 * - In local-only mode, children render unconditionally.
 * - In cloud mode, an auth form is shown until the user signs in.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const storageMode = useSyncStore((s) => s.storageMode);
  const { user, isLoading } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  // Local-only: no auth required
  if (storageMode === 'local' || !isSupabaseConfigured) {
    return <>{children}</>;
  }

  // Cloud mode: wait for session check
  if (isLoading) {
    return (
      <div
        className="flex min-h-[50vh] items-center justify-center"
        role="status"
        aria-label="Loading account status"
      >
        <Loader2
          className={cn(
            'text-muted-foreground size-6',
            !prefersReducedMotion && 'animate-spin',
          )}
          aria-hidden="true"
        />
      </div>
    );
  }

  // Cloud mode but not authenticated
  if (!user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <AuthForm />
      </div>
    );
  }

  return <>{children}</>;
}
