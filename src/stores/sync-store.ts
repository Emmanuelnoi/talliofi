import { create } from 'zustand';
import { safeGetLocalStorage, safeSetLocalStorage } from '@/lib/safe-storage';
import { shouldBlockCloudAuthInCurrentBuild } from '@/lib/security-controls';

export type StorageMode = 'local' | 'cloud' | 'encrypted';
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

const STORAGE_MODE_KEY = 'talliofi-storage-mode';
function readPersistedMode(): StorageMode {
  if (typeof window === 'undefined') return 'local';
  if (shouldBlockCloudAuthInCurrentBuild()) return 'local';
  const stored = safeGetLocalStorage(STORAGE_MODE_KEY);
  if (stored === 'cloud' || stored === 'encrypted') return stored;
  return 'local';
}

interface SyncState {
  storageMode: StorageMode;
  setStorageMode: (mode: StorageMode) => void;
  syncStatus: SyncStatus;
  setSyncStatus: (status: SyncStatus) => void;
  lastSyncedAt: string | null;
  setLastSyncedAt: (timestamp: string | null) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  storageMode: readPersistedMode(),
  setStorageMode: (mode) => {
    const nextMode =
      shouldBlockCloudAuthInCurrentBuild() && mode === 'cloud' ? 'local' : mode;
    safeSetLocalStorage(STORAGE_MODE_KEY, nextMode);
    set({ storageMode: nextMode });
  },
  syncStatus: 'idle',
  setSyncStatus: (status) => set({ syncStatus: status }),
  lastSyncedAt: null,
  setLastSyncedAt: (timestamp) => set({ lastSyncedAt: timestamp }),
}));
