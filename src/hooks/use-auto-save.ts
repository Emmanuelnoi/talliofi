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

/**
 * Watches `data` for changes, debounces, and calls `onSave`.
 *
 * Uses JSON serialization for deep equality comparison to avoid
 * unnecessary saves.
 */
export function useAutoSave<T>({
  data,
  onSave,
  debounceMs = 800,
  enabled = true,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [error, setError] = useState<Error | null>(null);

  const previousDataRef = useRef<string>('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveRef = useRef(onSave);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  const performSave = useCallback(
    async (dataToSave: T, signal: AbortSignal) => {
      if (!isMountedRef.current || signal.aborted) return;
      setStatus('saving');
      setError(null);
      try {
        await onSaveRef.current(dataToSave);
        if (!isMountedRef.current || signal.aborted) return;
        setStatus('saved');
        // Transition from 'saved' to 'idle' after a brief display
        savedTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setStatus('idle');
          }
        }, 2000);
      } catch (err) {
        if (!isMountedRef.current || signal.aborted) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setStatus('error');
      }
    },
    [],
  );

  useEffect(() => {
    if (!enabled) return;

    const serialized = JSON.stringify(data);

    // Initialize on first render — skip the first "change"
    if (previousDataRef.current === '') {
      previousDataRef.current = serialized;
      return;
    }

    // No change
    if (serialized === previousDataRef.current) return;
    previousDataRef.current = serialized;

    // Clear any pending save timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    // Clear any "saved" display timer
    if (savedTimerRef.current) {
      clearTimeout(savedTimerRef.current);
    }
    // Abort any in-flight save
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    timerRef.current = setTimeout(() => {
      void performSave(data, controller.signal);
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      controller.abort();
    };
  }, [data, debounceMs, enabled, performSave]);

  // Cleanup timers and in-flight saves on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
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
    }
    if (savedTimerRef.current) {
      clearTimeout(savedTimerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Update the previous data ref so the debounce effect doesn't re-fire
    previousDataRef.current = JSON.stringify(dataRef.current);

    void performSave(dataRef.current, controller.signal);
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

  return { status, error, saveNow };
}
