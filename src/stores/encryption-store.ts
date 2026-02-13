import { create } from 'zustand';
import { safeGetLocalStorage, safeSetLocalStorage } from '@/lib/safe-storage';

const ENCRYPTION_ENABLED_KEY = 'talliofi-local-encryption-enabled';
function readEncryptionEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return safeGetLocalStorage(ENCRYPTION_ENABLED_KEY) === 'true';
}

interface EncryptionState {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  unlocked: boolean;
  setUnlocked: (unlocked: boolean) => void;
}

export const useEncryptionStore = create<EncryptionState>((set) => ({
  enabled: readEncryptionEnabled(),
  setEnabled: (enabled) => {
    safeSetLocalStorage(ENCRYPTION_ENABLED_KEY, String(enabled));
    set({ enabled, unlocked: false });
  },
  unlocked: false,
  setUnlocked: (unlocked) => {
    set({ unlocked });
  },
}));
