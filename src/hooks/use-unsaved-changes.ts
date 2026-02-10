import { useCallback, useEffect } from 'react';
import { useBlocker } from 'react-router';

interface UseUnsavedChangesOptions {
  /**
   * Whether the form has unsaved changes. Typically sourced from
   * React Hook Form's `formState.isDirty` or a manual dirty flag.
   */
  isDirty: boolean;
}

interface UseUnsavedChangesReturn {
  /** The blocker object from React Router's useBlocker */
  blocker: ReturnType<typeof useBlocker>;
  /** Call to confirm navigation and proceed */
  confirmNavigation: () => void;
  /** Call to cancel navigation and stay on page */
  cancelNavigation: () => void;
}

/**
 * Prevents accidental data loss by warning users when navigating away
 * from a page with unsaved changes.
 *
 * Handles two scenarios:
 * 1. **Browser close/refresh** -- registers a `beforeunload` listener
 * 2. **Client-side navigation** -- uses React Router's `useBlocker`
 *
 * @example
 * ```tsx
 * const { blocker, confirmNavigation, cancelNavigation } = useUnsavedChanges({
 *   isDirty: formState.isDirty,
 * });
 * ```
 */
export function useUnsavedChanges({
  isDirty,
}: UseUnsavedChangesOptions): UseUnsavedChangesReturn {
  // Block client-side navigation when dirty
  const blocker = useBlocker(isDirty);

  // Block browser close/refresh when dirty
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  const confirmNavigation = useCallback(() => {
    if (blocker.state === 'blocked') {
      blocker.proceed();
    }
  }, [blocker]);

  const cancelNavigation = useCallback(() => {
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  }, [blocker]);

  return { blocker, confirmNavigation, cancelNavigation };
}
