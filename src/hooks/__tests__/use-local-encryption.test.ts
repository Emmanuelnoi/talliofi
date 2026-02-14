import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useLocalEncryption } from '../use-local-encryption';
import { useEncryptionStore } from '@/stores/encryption-store';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockClear = vi.fn();
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ clear: mockClear }),
}));

vi.mock('@/data/local-encryption/vault-repo', () => ({
  vaultRepo: {
    set: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue({ payload: 'encrypted' }),
    clear: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/data/local-encryption/vault-service', () => ({
  buildVaultPayload: vi.fn().mockResolvedValue('payload'),
  clearVaultKey: vi.fn(),
  restoreVaultPayload: vi.fn().mockResolvedValue(undefined),
  encryptVaultPayload: vi.fn().mockResolvedValue('encrypted'),
  decryptVaultPayload: vi.fn().mockResolvedValue('decrypted'),
  hasActiveVaultKey: vi.fn().mockReturnValue(true),
}));

vi.mock('@/data/db', () => ({
  clearAllData: vi.fn().mockResolvedValue(undefined),
}));

// ── Lazy imports so mocks are in place ───────────────────────────────────────

const getVaultRepo = async () =>
  (await import('@/data/local-encryption/vault-repo')).vaultRepo;

const getVaultService = async () =>
  await import('@/data/local-encryption/vault-service');

const getDb = async () => await import('@/data/db');

// ── Test suite ───────────────────────────────────────────────────────────────

describe('useLocalEncryption', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    useEncryptionStore.setState({ enabled: false, unlocked: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // 1. Initial state
  it('returns correct initial state', () => {
    const { result } = renderHook(() => useLocalEncryption());

    expect(result.current.enabled).toBe(false);
    expect(result.current.isLocked).toBe(false);
    expect(result.current.isBusy).toBe(false);
    expect(result.current.error).toBeNull();
  });

  // 2. isLocked derived state
  it('isLocked is true when enabled=true and unlocked=false', () => {
    useEncryptionStore.setState({ enabled: true, unlocked: false });

    const { result } = renderHook(() => useLocalEncryption());

    expect(result.current.isLocked).toBe(true);
  });

  // 3. enableEncryption happy path
  it('enableEncryption encrypts and saves the vault', async () => {
    const vaultRepo = await getVaultRepo();
    const vaultService = await getVaultService();
    const { result } = renderHook(() => useLocalEncryption());

    await act(async () => {
      await result.current.enableEncryption('my-password');
    });

    expect(vaultService.buildVaultPayload).toHaveBeenCalled();
    expect(vaultService.encryptVaultPayload).toHaveBeenCalledWith(
      'payload',
      'my-password',
    );
    expect(vaultRepo.set).toHaveBeenCalledWith('encrypted');
    expect(result.current.enabled).toBe(true);
    expect(mockClear).toHaveBeenCalled();
  });

  // 4. enableEncryption error path
  it('enableEncryption sets error and calls clearVaultKey on failure', async () => {
    const vaultService = await getVaultService();
    vi.mocked(vaultService.encryptVaultPayload).mockRejectedValueOnce(
      new Error('encrypt failed'),
    );

    const { result } = renderHook(() => useLocalEncryption());

    let caughtError: unknown;
    await act(async () => {
      try {
        await result.current.enableEncryption('bad');
      } catch (err) {
        caughtError = err;
      }
    });

    expect(caughtError).toBeInstanceOf(Error);
    expect((caughtError as Error).message).toBe('encrypt failed');
    expect(vaultService.clearVaultKey).toHaveBeenCalled();
    expect(result.current.error).toBe('encrypt failed');
    expect(result.current.isBusy).toBe(false);
  });

  // 5. unlock happy path
  it('unlock decrypts and restores the vault', async () => {
    useEncryptionStore.setState({ enabled: true, unlocked: false });

    const vaultRepo = await getVaultRepo();
    const vaultService = await getVaultService();
    const { result } = renderHook(() => useLocalEncryption());

    await act(async () => {
      await result.current.unlock('my-password');
    });

    expect(vaultRepo.get).toHaveBeenCalled();
    expect(vaultService.decryptVaultPayload).toHaveBeenCalledWith(
      'encrypted',
      'my-password',
    );
    expect(vaultService.restoreVaultPayload).toHaveBeenCalledWith('decrypted');
    expect(result.current.isLocked).toBe(false);
    expect(mockClear).toHaveBeenCalled();
  });

  // 6. unlock with no vault
  it('unlock throws when no vault record exists', async () => {
    useEncryptionStore.setState({ enabled: true, unlocked: false });

    const vaultRepo = await getVaultRepo();
    vi.mocked(vaultRepo.get).mockResolvedValueOnce(null);

    const { result } = renderHook(() => useLocalEncryption());

    let caughtError: unknown;
    await act(async () => {
      try {
        await result.current.unlock('password');
      } catch (err) {
        caughtError = err;
      }
    });

    expect(caughtError).toBeInstanceOf(Error);
    expect((caughtError as Error).message).toBe('No encrypted vault found.');
    expect(result.current.error).toBe('No encrypted vault found.');
  });

  // 7. lock happy path
  it('lock saves vault, clears data, and locks', async () => {
    useEncryptionStore.setState({ enabled: true, unlocked: true });

    const vaultService = await getVaultService();
    const db = await getDb();
    const { result } = renderHook(() => useLocalEncryption());

    await act(async () => {
      await result.current.lock();
    });

    // saveVault should have been invoked (which calls buildVaultPayload)
    expect(vaultService.buildVaultPayload).toHaveBeenCalled();
    expect(db.clearAllData).toHaveBeenCalledWith({ keepVault: true });
    expect(vaultService.clearVaultKey).toHaveBeenCalled();
    expect(result.current.isLocked).toBe(true);
    expect(mockClear).toHaveBeenCalled();
  });

  // 8. lock does nothing when not enabled
  it('lock does nothing when encryption is not enabled', async () => {
    const vaultService = await getVaultService();
    const db = await getDb();
    const { result } = renderHook(() => useLocalEncryption());

    await act(async () => {
      await result.current.lock();
    });

    expect(vaultService.buildVaultPayload).not.toHaveBeenCalled();
    expect(db.clearAllData).not.toHaveBeenCalled();
    expect(vaultService.clearVaultKey).not.toHaveBeenCalled();
  });

  // 9. disableEncryption
  it('disableEncryption clears vault and resets state', async () => {
    useEncryptionStore.setState({ enabled: true, unlocked: true });

    const vaultRepo = await getVaultRepo();
    const vaultService = await getVaultService();
    const { result } = renderHook(() => useLocalEncryption());

    await act(async () => {
      await result.current.disableEncryption();
    });

    expect(vaultRepo.clear).toHaveBeenCalled();
    expect(vaultService.clearVaultKey).toHaveBeenCalled();
    expect(result.current.enabled).toBe(false);
    expect(result.current.isLocked).toBe(false);
    expect(mockClear).toHaveBeenCalled();
  });

  // 10. scheduleVaultSave debounces
  it('scheduleVaultSave debounces and calls buildVaultPayload once', async () => {
    useEncryptionStore.setState({ enabled: true, unlocked: true });

    const vaultService = await getVaultService();
    const { result } = renderHook(() => useLocalEncryption());

    act(() => {
      result.current.scheduleVaultSave();
      result.current.scheduleVaultSave();
    });

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(vaultService.buildVaultPayload).toHaveBeenCalledTimes(1);
  });

  // 11. scheduleVaultSave does nothing when not enabled
  it('scheduleVaultSave does nothing when encryption is not enabled', async () => {
    const vaultService = await getVaultService();
    const { result } = renderHook(() => useLocalEncryption());

    act(() => {
      result.current.scheduleVaultSave();
    });

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(vaultService.buildVaultPayload).not.toHaveBeenCalled();
  });
});
