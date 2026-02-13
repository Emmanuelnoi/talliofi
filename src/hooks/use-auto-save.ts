import { useCallback, useEffect, useRef, useState } from 'react';

type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions<T> {
  /** The data to watch for changes */
  data: T;
  /** Called when data changes (after debounce) */
  onSave: (data: T) => Promise<void>;
  /** Debounce delay in milliseconds (default 800) */
  debounceMs?: number;
  /** Whether auto-save is enabled (default true) */
  enabled?: boolean;
}

interface UseAutoSaveReturn {
  status: AutoSaveStatus;
  error: Error | null;
  /** Immediately flush any pending save (e.g. triggered by Cmd+S) */
  saveNow: () => void;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;

    for (const key of aKeys) {
      if (!Object.hasOwn(b, key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
}

/**
 * Watches `data` for changes, debounces, and calls `onSave`.
 *
 * Uses structural deep equality comparison to avoid unnecessary saves.
 */
export function useAutoSave<T>({
  data,
  onSave,
  debounceMs = 800,
  enabled = true,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [error, setError] = useState<Error | null>(null);

  const previousDataRef = useRef<T | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveRef = useRef(onSave);
  const isMountedRef = useRef(true);
  const saveSequenceRef = useRef(0);
  const latestRequestedSequenceRef = useRef(0);
  const inFlightSaveCountRef = useRef(0);
  const hasPendingDebounceRef = useRef(false);

  // Keep the onSave ref current to avoid stale closures
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // Track mounted state for cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const performSave = useCallback(async (dataToSave: T, sequence: number) => {
    if (!isMountedRef.current) return;

    inFlightSaveCountRef.current += 1;
    setStatus('saving');
    setError(null);

    try {
      await onSaveRef.current(dataToSave);
      if (!isMountedRef.current) return;

      // Ignore stale saves: only the latest requested save may update status.
      if (sequence !== latestRequestedSequenceRef.current) return;

      setStatus('saved');
      savedTimerRef.current = setTimeout(() => {
        if (
          isMountedRef.current &&
          sequence === latestRequestedSequenceRef.current
        ) {
          setStatus('idle');
        }
      }, 2000);
    } catch (err) {
      if (!isMountedRef.current) return;

      // Ignore stale save failures when a newer save is pending/in-flight.
      if (sequence !== latestRequestedSequenceRef.current) return;

      setError(err instanceof Error ? err : new Error(String(err)));
      setStatus('error');
    } finally {
      inFlightSaveCountRef.current = Math.max(
        0,
        inFlightSaveCountRef.current - 1,
      );
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Initialize on first render — skip the first "change"
    if (previousDataRef.current === null) {
      previousDataRef.current = data;
      return;
    }

    // No change
    if (deepEqual(data, previousDataRef.current)) return;
    previousDataRef.current = data;

    // Clear any pending save timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      hasPendingDebounceRef.current = false;
    }
    // Clear any "saved" display timer
    if (savedTimerRef.current) {
      clearTimeout(savedTimerRef.current);
    }

    const sequence = ++saveSequenceRef.current;
    latestRequestedSequenceRef.current = sequence;
    hasPendingDebounceRef.current = true;

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      hasPendingDebounceRef.current = false;
      void performSave(data, sequence);
    }, debounceMs);
  }, [data, debounceMs, enabled, performSave]);

  // If auto-save is disabled, cancel pending debounce timers.
  useEffect(() => {
    if (enabled) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      hasPendingDebounceRef.current = false;
    }
  }, [enabled]);

  // Cleanup timers on unmount. In-flight saves are intentionally not aborted.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      hasPendingDebounceRef.current = false;
    };
  }, []);

  // Keep a ref to the latest data so saveNow always uses current values
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  /**
   * Immediately flush any pending debounced save.
   * If there is no pending change, triggers a save with the current data.
   */
  const saveNow = useCallback(() => {
    if (!enabledRef.current) return;

    // Clear the debounce timer since we're saving immediately
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      hasPendingDebounceRef.current = false;
    }
    if (savedTimerRef.current) {
      clearTimeout(savedTimerRef.current);
    }
    const sequence = ++saveSequenceRef.current;
    latestRequestedSequenceRef.current = sequence;

    // Update the previous data ref so the debounce effect doesn't re-fire
    previousDataRef.current = dataRef.current;

    void performSave(dataRef.current, sequence);
  }, [performSave]);

  // Listen for global app:save event (dispatched by Cmd+S shortcut)
  useEffect(() => {
    if (!enabled) return;

    const handleAppSave = () => {
      saveNow();
    };

    document.addEventListener('app:save', handleAppSave);
    return () => {
      document.removeEventListener('app:save', handleAppSave);
    };
  }, [enabled, saveNow]);

  // Warn on tab close when a debounced or in-flight save is pending.
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!enabledRef.current) return;
      if (
        !hasPendingDebounceRef.current &&
        inFlightSaveCountRef.current === 0
      ) {
        return;
      }

      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return { status, error, saveNow };
}
