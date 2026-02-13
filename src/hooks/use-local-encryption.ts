import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { vaultRepo } from '@/data/local-encryption/vault-repo';
import {
  buildVaultPayload,
  clearVaultKey,
  restoreVaultPayload,
  encryptVaultPayload,
  decryptVaultPayload,
  hasActiveVaultKey,
} from '@/data/local-encryption/vault-service';
import { clearAllData } from '@/data/db';
import { useEncryptionStore } from '@/stores/encryption-store';

const VAULT_SAVE_DEBOUNCE_MS = 800;

export interface UseLocalEncryptionResult {
  enabled: boolean;
  isLocked: boolean;
  isBusy: boolean;
  error: string | null;
  enableEncryption: (password: string) => Promise<void>;
  unlock: (password: string) => Promise<void>;
  lock: () => Promise<void>;
  disableEncryption: () => Promise<void>;
  scheduleVaultSave: () => void;
}

export function useLocalEncryption(): UseLocalEncryptionResult {
  const queryClient = useQueryClient();
  const { enabled, unlocked, setEnabled, setUnlocked } = useEncryptionStore();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isLocked = useMemo(() => enabled && !unlocked, [enabled, unlocked]);

  const saveVault = useCallback(async () => {
    if (!enabled || !unlocked || !hasActiveVaultKey()) return;
    const payload = await buildVaultPayload();
    const encrypted = await encryptVaultPayload(payload);
    await vaultRepo.set(encrypted);
  }, [enabled, unlocked]);

  const scheduleVaultSave = useCallback(() => {
    if (!enabled || !unlocked || !hasActiveVaultKey()) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      void saveVault();
    }, VAULT_SAVE_DEBOUNCE_MS);
  }, [enabled, unlocked, saveVault]);

  const enableEncryption = useCallback(
    async (nextPassword: string) => {
      setIsBusy(true);
      setError(null);
      try {
        const payload = await buildVaultPayload();
        const encrypted = await encryptVaultPayload(payload, nextPassword);
        await vaultRepo.set(encrypted);
        setEnabled(true);
        setUnlocked(true);
        queryClient.clear();
      } catch (err) {
        clearVaultKey();
        setError(
          err instanceof Error ? err.message : 'Failed to enable encryption.',
        );
        throw err;
      } finally {
        setIsBusy(false);
      }
    },
    [queryClient, setEnabled, setUnlocked],
  );

  const unlock = useCallback(
    async (nextPassword: string) => {
      setIsBusy(true);
      setError(null);
      try {
        const record = await vaultRepo.get();
        if (!record) {
          throw new Error('No encrypted vault found.');
        }
        const payload = await decryptVaultPayload(record.payload, nextPassword);
        await restoreVaultPayload(payload);
        setUnlocked(true);
        queryClient.clear();
      } catch (err) {
        clearVaultKey();
        setError(
          err instanceof Error ? err.message : 'Failed to unlock vault.',
        );
        throw err;
      } finally {
        setIsBusy(false);
      }
    },
    [queryClient, setUnlocked],
  );

  const lock = useCallback(async () => {
    if (!enabled || !unlocked) return;
    setIsBusy(true);
    setError(null);
    try {
      await saveVault();
      await clearAllData({ keepVault: true });
      clearVaultKey();
      setUnlocked(false);
      queryClient.clear();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to lock vault.');
      throw err;
    } finally {
      setIsBusy(false);
    }
  }, [enabled, unlocked, saveVault, setUnlocked, queryClient]);

  const disableEncryption = useCallback(async () => {
    setIsBusy(true);
    setError(null);
    try {
      await vaultRepo.clear();
      clearVaultKey();
      setEnabled(false);
      setUnlocked(false);
      queryClient.clear();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to disable encryption.',
      );
      throw err;
    } finally {
      setIsBusy(false);
    }
  }, [queryClient, setEnabled, setUnlocked]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  return {
    enabled,
    isLocked,
    isBusy,
    error,
    enableEncryption,
    unlock,
    lock,
    disableEncryption,
    scheduleVaultSave,
  };
}
