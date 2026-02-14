import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  SYNC_MAX_RETRY_DELAY_MS,
  SYNC_BASE_RETRY_DELAY_MS,
  AUTO_SYNC_INTERVAL_MS,
} from '@/lib/constants';
import { changelogRepo } from '@/data/repos/changelog-repo';
import { encrypt, decrypt, type EncryptedPayload } from './encryption';
import { db } from '@/data/db';
import {
  safeGetLocalStorage,
  safeSetLocalStorage,
} from '@/lib/safe-storage';
import type { ChangeLogEntry } from '@/domain/plan/types';
import type { Table } from 'dexie';

export type SyncState =
  | 'idle'
  | 'syncing'
  | 'error'
  | 'retry_pending'
  | 'offline';

import type { StorageMode } from '@/stores/sync-store';
export type { StorageMode } from '@/stores/sync-store';

/** Prefix for sync watermark localStorage keys */
const SYNC_WATERMARK_PREFIX = 'talliofi-sync-watermark-';

/**
 * Maps a ChangeLogEntry entityType to the corresponding Dexie table.
 * Returns undefined if the entity type is not recognized.
 */
function getTableForEntityType(
  entityType: ChangeLogEntry['entityType'],
): Table | undefined {
  const tableMap: Record<ChangeLogEntry['entityType'], Table> = {
    plan: db.plans,
    expense: db.expenses,
    bucket: db.buckets,
    tax_component: db.taxComponents,
    snapshot: db.snapshots,
    goal: db.goals,
    asset: db.assets,
    liability: db.liabilities,
    net_worth_snapshot: db.netWorthSnapshots,
    recurring_template: db.recurringTemplates,
  };
  return tableMap[entityType];
}

/**
 * Supabase row shape returned from the changelog table (snake_case columns).
 */
interface SupabaseChangelogRow {
  id: string;
  plan_id: string;
  entity_type: ChangeLogEntry['entityType'];
  entity_id: string;
  operation: ChangeLogEntry['operation'];
  timestamp: string;
  payload: string | null;
  is_encrypted: boolean;
}

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
  /** Called after pull completes with the number of applied entries */
  onPullComplete?: (count: number) => void;
}

/**
 * Change-log-based sync engine with exponential backoff.
 *
 * Reads unsynced ChangeLogEntry rows from the local Dexie changelog
 * table and pushes them to Supabase. Pulls remote changes and applies
 * them locally using last-writer-wins conflict resolution. Listens to
 * `navigator.onLine` for offline detection.
 *
 * Uses dependency injection for store interactions to maintain clean
 * architecture boundaries (data layer should not import from stores).
 */
const MAX_RETRY_ATTEMPTS = 5;
const SYNC_DEBOUNCE_MS = 500;

export function createSyncEngine(options: SyncEngineOptions) {
  let state: SyncState = 'idle';
  let retryCount = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let autoSyncInterval: ReturnType<typeof setInterval> | null = null;
  let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
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
   * Decrypts a payload string using the configured encryption password.
   * Returns the decrypted plaintext.
   */
  async function decryptPayload(payload: string): Promise<string> {
    const password = options.getEncryptionPassword?.();
    if (!password) {
      throw new Error(
        'Encryption password is required for encrypted sync mode',
      );
    }
    const encryptedData: EncryptedPayload = JSON.parse(payload) as EncryptedPayload;
    return decrypt(encryptedData, password);
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

  /**
   * Pulls changelog entries from Supabase that are newer than the last
   * sync watermark and applies them to the local Dexie database.
   *
   * Uses last-writer-wins conflict resolution:
   * - For entries with the same entityId + entityType, the later timestamp wins.
   * - Delete operations always win regardless of timestamp.
   */
  async function pullChanges(
    planId: string,
    isEncrypted: boolean,
  ): Promise<number> {
    if (!supabase) return 0;

    const watermarkKey = `${SYNC_WATERMARK_PREFIX}${planId}`;
    const lastWatermark = safeGetLocalStorage(watermarkKey);

    // Fetch remote entries newer than the watermark
    let query = supabase
      .from('changelog')
      .select('*')
      .eq('plan_id', planId)
      .order('timestamp', { ascending: true });

    if (lastWatermark) {
      query = query.gt('timestamp', lastWatermark);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Supabase pull failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return 0;
    }

    const remoteEntries = data as SupabaseChangelogRow[];

    // Fetch local changelog entries for conflict resolution
    const localEntries = await changelogRepo.getByPlanId(planId);
    const localEntryMap = new Map<string, ChangeLogEntry>();
    for (const entry of localEntries) {
      // Key by entityType + entityId for conflict lookup
      const key = `${entry.entityType}:${entry.entityId}`;
      const existing = localEntryMap.get(key);
      // Keep the latest local entry per entity
      if (!existing || entry.timestamp > existing.timestamp) {
        localEntryMap.set(key, entry);
      }
    }

    let appliedCount = 0;
    let latestTimestamp = lastWatermark ?? '';

    for (const row of remoteEntries) {
      // Track the latest timestamp for watermark update
      if (row.timestamp > latestTimestamp) {
        latestTimestamp = row.timestamp;
      }

      const conflictKey = `${row.entity_type}:${row.entity_id}`;
      const localEntry = localEntryMap.get(conflictKey);

      // Conflict resolution: delete always wins, otherwise last-writer-wins
      if (row.operation !== 'delete' && localEntry) {
        if (localEntry.timestamp >= row.timestamp) {
          // Local entry is newer or equal, skip this remote entry
          continue;
        }
      }

      // Apply the remote change to the local Dexie database
      const applied = await applyRemoteEntry(row, isEncrypted);
      if (applied) {
        appliedCount++;
      }
    }

    // Persist the watermark after successful application
    if (latestTimestamp) {
      safeSetLocalStorage(watermarkKey, latestTimestamp);
    }

    return appliedCount;
  }

  /**
   * Applies a single remote changelog entry to the local Dexie database.
   * Handles create, update, and delete operations by routing to the
   * appropriate Dexie table based on entityType.
   *
   * Returns true if the entry was successfully applied.
   */
  async function applyRemoteEntry(
    row: SupabaseChangelogRow,
    isEncrypted: boolean,
  ): Promise<boolean> {
    const table = getTableForEntityType(row.entity_type);
    if (!table) {
      return false;
    }

    try {
      if (row.operation === 'delete') {
        await table.delete(row.entity_id);
        return true;
      }

      // For create/update, payload is required
      if (!row.payload) {
        return false;
      }

      // Decrypt if the entry was encrypted
      let payloadStr = row.payload;
      if (row.is_encrypted && isEncrypted) {
        payloadStr = await decryptPayload(payloadStr);
      }

      const entity: unknown = JSON.parse(payloadStr);

      // Upsert: works for both create and update
      await table.put(entity);
      return true;
    } catch {
      // Individual entry failures should not abort the entire pull.
      // The entry will be retried on the next sync cycle.
      return false;
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

      // --- Push local changes to Supabase ---
      const entries = await changelogRepo.getByPlanId(planId);

      if (entries.length > 0) {
        await pushChanges(entries, isEncrypted);
      }

      // --- Pull remote changes from Supabase ---
      const pullCount = await pullChanges(planId, isEncrypted);
      options.onPullComplete?.(pullCount);

      // --- Cleanup old changelog entries ---
      await changelogRepo.cleanup(planId);

      retryCount = 0;
      setState('idle');
      options.onLastSyncedAtChange?.(new Date().toISOString());
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      options.onError?.(err);
      retryCount += 1;

      if (retryCount >= MAX_RETRY_ATTEMPTS) {
        setState('error');
        return;
      }

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

  /**
   * Debounced sync trigger — coalesces rapid calls into one sync after SYNC_DEBOUNCE_MS.
   * Useful for UI-driven changes that fire rapidly (e.g., auto-save).
   */
  function debouncedSync(): void {
    if (syncDebounceTimer !== null) {
      clearTimeout(syncDebounceTimer);
    }
    syncDebounceTimer = setTimeout(() => {
      syncDebounceTimer = null;
      if (!disposed) {
        void triggerSync();
      }
    }, SYNC_DEBOUNCE_MS);
  }

  function dispose(): void {
    disposed = true;
    clearRetryTimer();
    if (syncDebounceTimer !== null) {
      clearTimeout(syncDebounceTimer);
      syncDebounceTimer = null;
    }
    disableAutoSync();
  }

  return {
    get state() {
      return state;
    },
    triggerSync,
    debouncedSync,
    enableAutoSync,
    disableAutoSync,
    dispose,
  };
}

export type SyncEngine = ReturnType<typeof createSyncEngine>;
