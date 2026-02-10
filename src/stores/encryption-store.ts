import { create } from 'zustand';

const ENCRYPTION_ENABLED_KEY = 'talliofi-local-encryption-enabled';
function readEncryptionEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(ENCRYPTION_ENABLED_KEY) === 'true';
}

interface EncryptionState {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  password: string | null;
  setPassword: (password: string | null) => void;
}

export const useEncryptionStore = create<EncryptionState>((set) => ({
  enabled: readEncryptionEnabled(),
  setEnabled: (enabled) => {
    localStorage.setItem(ENCRYPTION_ENABLED_KEY, String(enabled));
    set({ enabled });
  },
  password: null,
  setPassword: (password) => {
    set({ password });
  },
}));
