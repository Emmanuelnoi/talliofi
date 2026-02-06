import { describe, it, expect, afterEach } from 'vitest';
import { createSyncEngine } from '../sync-engine';
import type { SyncState } from '../sync-engine';

// The sync engine checks isSupabaseConfigured which reads import.meta.env.
// In test env supabase is not configured, so sync operations are no-ops.
// We test the state machine shape, callback wiring, and lifecycle methods.

describe('createSyncEngine', () => {
  let engine: ReturnType<typeof createSyncEngine> | null = null;

  afterEach(() => {
    engine?.dispose();
    engine = null;
  });

  it('starts in idle state', () => {
    engine = createSyncEngine();
    expect(engine.state).toBe('idle');
  });

  it('triggerSync stays idle when supabase is not configured', async () => {
    const states: SyncState[] = [];
    engine = createSyncEngine({
      onStateChange: (s) => states.push(s),
    });

    await engine.triggerSync();

    // Without Supabase configured, triggerSync returns early
    expect(engine.state).toBe('idle');
  });

  it('does not call onError when supabase is not configured', async () => {
    const errors: Error[] = [];
    engine = createSyncEngine({
      onError: (err) => errors.push(err),
    });

    await engine.triggerSync();
    expect(errors).toHaveLength(0);
  });

  it('enableAutoSync and disableAutoSync do not throw', () => {
    engine = createSyncEngine();

    // Should not throw
    engine.enableAutoSync(60_000);
    engine.disableAutoSync();
  });

  it('dispose cleans up without error', () => {
    engine = createSyncEngine();
    engine.enableAutoSync();
    engine.dispose();

    expect(engine.state).toBe('idle');
    // Set to null so afterEach doesn't double-dispose
    engine = null;
  });

  it('exposes triggerSync, enableAutoSync, disableAutoSync, dispose', () => {
    engine = createSyncEngine();

    expect(typeof engine.triggerSync).toBe('function');
    expect(typeof engine.enableAutoSync).toBe('function');
    expect(typeof engine.disableAutoSync).toBe('function');
    expect(typeof engine.dispose).toBe('function');
    expect(typeof engine.state).toBe('string');
  });
});
