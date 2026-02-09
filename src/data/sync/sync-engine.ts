import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  SYNC_MAX_RETRY_DELAY_MS,
  SYNC_BASE_RETRY_DELAY_MS,
  AUTO_SYNC_INTERVAL_MS,
} from '@/lib/constants';
import { changelogRepo } from '@/data/repos/changelog-repo';
import { encrypt, type EncryptedPayload } from './encryption';
import type { ChangeLogEntry } from '@/domain/plan/types';

export type SyncState =
  | 'idle'
  | 'syncing'
  | 'error'
  | 'retry_pending'
  | 'offline';

export type StorageMode = 'local' | 'cloud' | 'encrypted';

/**
 * Configuration for the sync engine.
 * Uses dependency injection to avoid coupling to stores.
 */
interface SyncEngineOptions {
  /** Called when the engine changes state */
  onStateChange?: (state: SyncState) => void;
  /** Called when an error occurs */
  onError?: (error: Error) => void;
  /** Returns the current storage mode */
  getStorageMode: () => StorageMode;
  /** Returns the active plan ID, or null if no plan is active */
  getActivePlanId: () => string | null;
  /** Called when sync status should be updated in the store */
  onSyncStatusChange?: (
    status: 'idle' | 'syncing' | 'error' | 'offline',
  ) => void;
  /** Called when last synced timestamp should be updated */
  onLastSyncedAtChange?: (timestamp: string | null) => void;
  /** Encryption password for encrypted sync mode (required when storageMode is 'encrypted') */
  getEncryptionPassword?: () => string | null;
}

/**
 * Change-log-based sync engine with exponential backoff.
 *
 * Reads unsynced ChangeLogEntry rows from the local Dexie changelog
 * table and pushes them to Supabase. Listens to `navigator.onLine`
 * for offline detection.
 *
 * Uses dependency injection for store interactions to maintain clean
 * architecture boundaries (data layer should not import from stores).
 */
export function createSyncEngine(options: SyncEngineOptions) {
  let state: SyncState = 'idle';
  let retryCount = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let autoSyncInterval: ReturnType<typeof setInterval> | null = null;
  let disposed = false;

  function setState(next: SyncState): void {
    state = next;
    options.onStateChange?.(next);
    const mappedStatus =
      next === 'retry_pending'
        ? 'error'
        : next === 'syncing'
          ? 'syncing'
          : next;
    options.onSyncStatusChange?.(mappedStatus);
  }

  function getRetryDelay(): number {
    const delay = SYNC_BASE_RETRY_DELAY_MS * Math.pow(2, retryCount);
    return Math.min(delay, SYNC_MAX_RETRY_DELAY_MS);
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

  /**
   * Encrypts a payload string using the configured encryption password.
   * Returns the encrypted payload as a JSON string, or null if encryption fails.
   */
  async function encryptPayload(payload: string): Promise<string | null> {
    const password = options.getEncryptionPassword?.();
    if (!password) {
      throw new Error(
        'Encryption password is required for encrypted sync mode',
      );
    }
    const encrypted: EncryptedPayload = await encrypt(payload, password);
    return JSON.stringify(encrypted);
  }

  /**
   * Pushes changelog entries to Supabase.
   * When in encrypted mode, payloads are encrypted before transmission.
   */
  async function pushChanges(
    entries: ChangeLogEntry[],
    isEncrypted: boolean,
  ): Promise<void> {
    if (!supabase) return;

    // Map camelCase client fields to snake_case Postgres columns
    // Optionally encrypt payloads for encrypted sync mode
    const rows = await Promise.all(
      entries.map(async (entry) => {
        let payload = entry.payload ?? null;

        // Encrypt payload if in encrypted mode and payload exists
        if (isEncrypted && payload) {
          payload = await encryptPayload(payload);
        }

        return {
          id: entry.id,
          plan_id: entry.planId,
          entity_type: entry.entityType,
          entity_id: entry.entityId,
          operation: entry.operation,
          timestamp: entry.timestamp,
          payload,
          // Mark whether this entry is encrypted for decryption on pull
          is_encrypted: isEncrypted && payload !== null,
        };
      }),
    );

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
      const storageMode = options.getStorageMode();

      // Only sync when in cloud or encrypted mode
      if (storageMode === 'local') {
        setState('idle');
        return;
      }

      const isEncrypted = storageMode === 'encrypted';

      // Validate encryption password is available for encrypted mode
      if (isEncrypted && !options.getEncryptionPassword?.()) {
        throw new Error(
          'Encryption password is required for encrypted sync mode',
        );
      }

      // Get the active plan ID through dependency injection
      const planId = options.getActivePlanId();

      if (!planId) {
        // No active plan, nothing to sync
        setState('idle');
        return;
      }

      // Fetch changelog entries for the active plan
      const entries = await changelogRepo.getByPlanId(planId);

      if (entries.length > 0) {
        await pushChanges(entries, isEncrypted);
      }

      retryCount = 0;
      setState('idle');
      options.onLastSyncedAtChange?.(new Date().toISOString());
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

  function enableAutoSync(intervalMs = AUTO_SYNC_INTERVAL_MS): void {
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
