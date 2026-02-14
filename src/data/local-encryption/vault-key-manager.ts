import {
  decodeBase64,
  decryptWithKey,
  deriveKey,
  encodeBase64,
  encryptWithKey,
  type EncryptedPayload,
} from '@/data/sync/encryption';

const SALT_BYTES = 16;

/** Idle timeout before vault key is automatically cleared (5 minutes) */
const VAULT_IDLE_TIMEOUT_MS = 5 * 60 * 1000;

let activeVaultKey: CryptoKey | null = null;
let activeSaltBase64: string | null = null;
let idleTimerId: ReturnType<typeof setTimeout> | null = null;
let listenersAttached = false;

function getActiveVaultKey(): CryptoKey {
  if (!activeVaultKey || !activeSaltBase64) {
    throw new Error('Vault is locked. Unlock before encrypting data.');
  }
  return activeVaultKey;
}

function getActiveSaltBase64(): string {
  if (!activeSaltBase64) {
    throw new Error('Vault key metadata is missing.');
  }
  return activeSaltBase64;
}

export function hasActiveVaultKey(): boolean {
  return activeVaultKey !== null && activeSaltBase64 !== null;
}

export function clearActiveVaultKey(): void {
  activeVaultKey = null;
  activeSaltBase64 = null;
  clearIdleTimer();
  detachAutoLockListeners();
}

// --- Auto-lock on idle / tab switch ---

function clearIdleTimer(): void {
  if (idleTimerId !== null) {
    clearTimeout(idleTimerId);
    idleTimerId = null;
  }
}

function resetIdleTimer(): void {
  clearIdleTimer();
  if (!activeVaultKey) return;
  idleTimerId = setTimeout(() => {
    clearActiveVaultKey();
  }, VAULT_IDLE_TIMEOUT_MS);
}

function handleVisibilityChange(): void {
  if (document.visibilityState === 'hidden' && activeVaultKey) {
    // Clear key immediately when user switches away from tab
    clearActiveVaultKey();
  }
}

function handleUserActivity(): void {
  if (activeVaultKey) {
    resetIdleTimer();
  }
}

function attachAutoLockListeners(): void {
  if (listenersAttached) return;
  listenersAttached = true;

  document.addEventListener('visibilitychange', handleVisibilityChange);
  // Reset idle timer on user interaction
  document.addEventListener('keydown', handleUserActivity, { passive: true });
  document.addEventListener('pointerdown', handleUserActivity, {
    passive: true,
  });
}

function detachAutoLockListeners(): void {
  if (!listenersAttached) return;
  listenersAttached = false;

  document.removeEventListener('visibilitychange', handleVisibilityChange);
  document.removeEventListener('keydown', handleUserActivity);
  document.removeEventListener('pointerdown', handleUserActivity);
}

// --- Key management ---

export async function activateVaultKey(
  password: string,
  saltBase64?: string,
): Promise<string> {
  const salt = saltBase64
    ? decodeBase64(saltBase64)
    : crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const key = await deriveKey(password, salt);

  activeVaultKey = key;
  activeSaltBase64 = encodeBase64(salt);

  // Start auto-lock timers and listeners
  attachAutoLockListeners();
  resetIdleTimer();

  return activeSaltBase64;
}

export async function encryptWithActiveVaultKey(
  plaintext: string,
): Promise<EncryptedPayload> {
  const key = getActiveVaultKey();
  const saltBase64 = getActiveSaltBase64();
  return encryptWithKey(plaintext, key, saltBase64);
}

export async function decryptWithPasswordAndActivateVaultKey(
  payload: EncryptedPayload,
  password: string,
): Promise<string> {
  await activateVaultKey(password, payload.salt);
  return decryptWithActiveVaultKey(payload);
}

export async function decryptWithActiveVaultKey(
  payload: EncryptedPayload,
): Promise<string> {
  return decryptWithKey(payload, getActiveVaultKey());
}
