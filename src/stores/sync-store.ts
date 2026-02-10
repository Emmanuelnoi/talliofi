import { create } from 'zustand';

export type StorageMode = 'local' | 'cloud' | 'encrypted';
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

const STORAGE_MODE_KEY = 'talliofi-storage-mode';
function readPersistedMode(): StorageMode {
  if (typeof window === 'undefined') return 'local';
  const stored = localStorage.getItem(STORAGE_MODE_KEY);
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
  /** Encryption password for encrypted sync mode. Memory-only — never persisted. */
  encryptionPassword: string | null;
  setEncryptionPassword: (password: string | null) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  storageMode: readPersistedMode(),
  setStorageMode: (mode) => {
    localStorage.setItem(STORAGE_MODE_KEY, mode);
    set({ storageMode: mode });
  },
  syncStatus: 'idle',
  setSyncStatus: (status) => set({ syncStatus: status }),
  lastSyncedAt: null,
  setLastSyncedAt: (timestamp) => set({ lastSyncedAt: timestamp }),
  encryptionPassword: null,
  setEncryptionPassword: (password) => {
    set({ encryptionPassword: password });
  },
}));
