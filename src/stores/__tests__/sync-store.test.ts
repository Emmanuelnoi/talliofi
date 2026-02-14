import { describe, it, expect, beforeEach } from 'vitest';
import { useSyncStore } from '../sync-store';

describe('useSyncStore', () => {
  beforeEach(() => {
    useSyncStore.setState({
      storageMode: 'local',
      syncStatus: 'idle',
      lastSyncedAt: null,
    });
  });

  it('has correct default values', () => {
    const state = useSyncStore.getState();
    expect(state.storageMode).toBe('local');
    expect(state.syncStatus).toBe('idle');
    expect(state.lastSyncedAt).toBeNull();
  });

  it('sets storage mode', () => {
    useSyncStore.getState().setStorageMode('cloud');
    expect(useSyncStore.getState().storageMode).toBe('cloud');
  });

  it('sets sync status', () => {
    useSyncStore.getState().setSyncStatus('syncing');
    expect(useSyncStore.getState().syncStatus).toBe('syncing');

    useSyncStore.getState().setSyncStatus('error');
    expect(useSyncStore.getState().syncStatus).toBe('error');
  });

  it('sets last synced at', () => {
    const timestamp = '2026-01-15T10:00:00.000Z';
    useSyncStore.getState().setLastSyncedAt(timestamp);
    expect(useSyncStore.getState().lastSyncedAt).toBe(timestamp);

    useSyncStore.getState().setLastSyncedAt(null);
    expect(useSyncStore.getState().lastSyncedAt).toBeNull();
  });

  it('maintains independent state', () => {
    const state = useSyncStore.getState();
    state.setSyncStatus('syncing');
    state.setLastSyncedAt('2026-01-15T10:00:00.000Z');

    const updated = useSyncStore.getState();
    expect(updated.syncStatus).toBe('syncing');
    expect(updated.lastSyncedAt).toBe('2026-01-15T10:00:00.000Z');
    expect(updated.storageMode).toBe('local');
  });
});
