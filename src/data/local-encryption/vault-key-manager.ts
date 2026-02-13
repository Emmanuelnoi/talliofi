import {
  decodeBase64,
  decryptWithKey,
  deriveKey,
  encodeBase64,
  encryptWithKey,
  type EncryptedPayload,
} from '@/data/sync/encryption';

const SALT_BYTES = 16;

let activeVaultKey: CryptoKey | null = null;
let activeSaltBase64: string | null = null;

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
}

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
