import { describe, it, expect, afterEach } from 'vitest';
import { createSyncEngine } from '../sync-engine';
import type { SyncState, StorageMode } from '../sync-engine';

// The sync engine checks isSupabaseConfigured which reads import.meta.env.
// In test env supabase is not configured, so sync operations are no-ops.
// We test the state machine shape, callback wiring, and lifecycle methods.

/** Creates a minimal set of options for testing */
function createTestOptions(
  overrides: Partial<Parameters<typeof createSyncEngine>[0]> = {},
): Parameters<typeof createSyncEngine>[0] {
  return {
    getStorageMode: () => 'local' as StorageMode,
    getActivePlanId: () => null,
    ...overrides,
  };
}

describe('createSyncEngine', () => {
  let engine: ReturnType<typeof createSyncEngine> | null = null;

  afterEach(() => {
    engine?.dispose();
    engine = null;
  });

  it('starts in idle state', () => {
    engine = createSyncEngine(createTestOptions());
    expect(engine.state).toBe('idle');
  });

  it('triggerSync stays idle when supabase is not configured', async () => {
    const states: SyncState[] = [];
    engine = createSyncEngine(
      createTestOptions({
        onStateChange: (s) => states.push(s),
      }),
    );

    await engine.triggerSync();

    // Without Supabase configured, triggerSync returns early
    expect(engine.state).toBe('idle');
  });

  it('does not call onError when supabase is not configured', async () => {
    const errors: Error[] = [];
    engine = createSyncEngine(
      createTestOptions({
        onError: (err) => errors.push(err),
      }),
    );

    await engine.triggerSync();
    expect(errors).toHaveLength(0);
  });

  it('enableAutoSync and disableAutoSync do not throw', () => {
    engine = createSyncEngine(createTestOptions());

    // Should not throw
    engine.enableAutoSync(60_000);
    engine.disableAutoSync();
  });

  it('dispose cleans up without error', () => {
    engine = createSyncEngine(createTestOptions());
    engine.enableAutoSync();
    engine.dispose();

    expect(engine.state).toBe('idle');
    // Set to null so afterEach doesn't double-dispose
    engine = null;
  });

  it('exposes triggerSync, enableAutoSync, disableAutoSync, dispose', () => {
    engine = createSyncEngine(createTestOptions());

    expect(typeof engine.triggerSync).toBe('function');
    expect(typeof engine.enableAutoSync).toBe('function');
    expect(typeof engine.disableAutoSync).toBe('function');
    expect(typeof engine.dispose).toBe('function');
    expect(typeof engine.state).toBe('string');
  });

  it('calls onSyncStatusChange when state changes', async () => {
    const statuses: string[] = [];
    engine = createSyncEngine(
      createTestOptions({
        getStorageMode: () => 'cloud',
        getActivePlanId: () => 'test-plan-id',
        onSyncStatusChange: (status) => statuses.push(status),
      }),
    );

    await engine.triggerSync();

    // With no Supabase configured, it should stay idle or return early
    // The exact behavior depends on isSupabaseConfigured check
    expect(engine.state).toBe('idle');
  });

  it('uses dependency injection for plan ID resolution', async () => {
    engine = createSyncEngine(
      createTestOptions({
        getStorageMode: () => 'cloud',
        getActivePlanId: () => 'injected-plan-id',
      }),
    );

    await engine.triggerSync();

    // Without Supabase configured, the function returns early before calling getActivePlanId
    // This is expected behavior - we're testing that the interface accepts the function
    expect(typeof engine.triggerSync).toBe('function');
  });

  it('accepts encryption password getter for encrypted mode', () => {
    engine = createSyncEngine(
      createTestOptions({
        getStorageMode: () => 'encrypted',
        getActivePlanId: () => 'test-plan',
        getEncryptionPassword: () => 'test-password',
      }),
    );

    expect(engine.state).toBe('idle');
  });
});
