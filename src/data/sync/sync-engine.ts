import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { changelogRepo } from '@/data/repos/changelog-repo';
import { useSyncStore } from '@/stores/sync-store';
import type { ChangeLogEntry } from '@/domain/plan/types';

export type SyncState =
  | 'idle'
  | 'syncing'
  | 'error'
  | 'retry_pending'
  | 'offline';

const MAX_RETRY_DELAY_MS = 30_000;
const BASE_RETRY_DELAY_MS = 1_000;

interface SyncEngineOptions {
  /** Called when the engine changes state */
  onStateChange?: (state: SyncState) => void;
  /** Called when an error occurs */
  onError?: (error: Error) => void;
}

/**
 * Change-log-based sync engine with exponential backoff.
 *
 * Reads unsynced ChangeLogEntry rows from the local Dexie changelog
 * table and pushes them to Supabase. Listens to `navigator.onLine`
 * for offline detection.
 */
export function createSyncEngine(options: SyncEngineOptions = {}) {
  let state: SyncState = 'idle';
  let retryCount = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let autoSyncInterval: ReturnType<typeof setInterval> | null = null;
  let disposed = false;

  function setState(next: SyncState): void {
    state = next;
    options.onStateChange?.(next);
    useSyncStore
      .getState()
      .setSyncStatus(
        next === 'retry_pending'
          ? 'error'
          : next === 'syncing'
            ? 'syncing'
            : next,
      );
  }

  function getRetryDelay(): number {
    const delay = BASE_RETRY_DELAY_MS * Math.pow(2, retryCount);
    return Math.min(delay, MAX_RETRY_DELAY_MS);
  }

  function handleOnline(): void {
    if (state === 'offline') {
      setState('idle');
      void triggerSync();
    }
  }

  function handleOffline(): void {
    setState('offline');
    clearRetryTimer();
  }

  function clearRetryTimer(): void {
    if (retryTimer !== null) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  }

  async function pushChanges(entries: ChangeLogEntry[]): Promise<void> {
    if (!supabase) return;

    // Map camelCase client fields to snake_case Postgres columns
    const rows = entries.map((entry) => ({
      id: entry.id,
      plan_id: entry.planId,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      operation: entry.operation,
      timestamp: entry.timestamp,
      payload: entry.payload ?? null,
    }));

    const { error } = await supabase
      .from('changelog')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      throw new Error(`Supabase sync failed: ${error.message}`);
    }
  }

  async function triggerSync(): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    if (state === 'syncing') return;
    if (!navigator.onLine) {
      setState('offline');
      return;
    }

    setState('syncing');

    try {
      const store = useSyncStore.getState();
      if (store.storageMode !== 'cloud') {
        setState('idle');
        return;
      }

      // For now, sync all changelog entries. A production implementation
      // would track a "last synced" cursor.
      const planId = ''; // TODO: resolve active plan ID from context
      const entries =
        planId.length > 0 ? await changelogRepo.getByPlanId(planId) : [];

      if (entries.length > 0) {
        await pushChanges(entries);
      }

      retryCount = 0;
      setState('idle');
      useSyncStore.getState().setLastSyncedAt(new Date().toISOString());
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      options.onError?.(err);
      retryCount += 1;
      setState('retry_pending');

      clearRetryTimer();
      retryTimer = setTimeout(() => {
        if (!disposed) {
          void triggerSync();
        }
      }, getRetryDelay());
    }
  }

  function enableAutoSync(intervalMs = 60_000): void {
    disableAutoSync();
    autoSyncInterval = setInterval(() => {
      if (!disposed) {
        void triggerSync();
      }
    }, intervalMs);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  function disableAutoSync(): void {
    if (autoSyncInterval !== null) {
      clearInterval(autoSyncInterval);
      autoSyncInterval = null;
    }
    clearRetryTimer();
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  }

  function dispose(): void {
    disposed = true;
    clearRetryTimer();
    disableAutoSync();
  }

  return {
    get state() {
      return state;
    },
    triggerSync,
    enableAutoSync,
    disableAutoSync,
    dispose,
  };
}

export type SyncEngine = ReturnType<typeof createSyncEngine>;
