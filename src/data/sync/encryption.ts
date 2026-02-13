/**
 * Client-side encryption utilities using the Web Crypto API.
 *
 * Uses PBKDF2 for key derivation and AES-256-GCM for authenticated encryption.
 * All operations are async because SubtleCrypto is entirely promise-based.
 */

import { PBKDF2_ITERATIONS } from '@/lib/constants';

export interface EncryptedPayload {
  /** Base64-encoded initialisation vector */
  iv: string;
  /** Base64-encoded ciphertext (includes GCM auth tag) */
  ciphertext: string;
  /** Base64-encoded salt used for key derivation */
  salt: string;
}
const SALT_BYTES = 16;
const IV_BYTES = 12; // 96-bit IV recommended for AES-GCM

export function encodeBase64(buffer: Uint8Array | ArrayBuffer): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derives a 256-bit AES-GCM key from a password and salt using PBKDF2.
 * With the same password and salt, the derived key is deterministic.
 */
export async function deriveKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Encrypts a plaintext string with AES-256-GCM.
 * Generates a random salt and IV for each call.
 */
export async function encrypt(
  data: string,
  password: string,
): Promise<EncryptedPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const key = await deriveKey(password, salt);

  return encryptWithKey(data, key, encodeBase64(salt));
}

/**
 * Encrypts plaintext with an already-derived AES-GCM key.
 * Callers must provide the key derivation salt used for this key.
 */
export async function encryptWithKey(
  data: string,
  key: CryptoKey,
  saltBase64: string,
): Promise<EncryptedPayload> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data),
  );

  return {
    iv: encodeBase64(iv),
    ciphertext: encodeBase64(ciphertext),
    salt: saltBase64,
  };
}

/**
 * Decrypts an EncryptedPayload back to a plaintext string.
 * Throws if the key is wrong or the ciphertext has been tampered with.
 */
export async function decrypt(
  payload: EncryptedPayload,
  password: string,
): Promise<string> {
  const salt = decodeBase64(payload.salt);
  const key = await deriveKey(password, salt);

  return decryptWithKey(payload, key);
}

/**
 * Decrypts an EncryptedPayload with an already-derived AES-GCM key.
 */
export async function decryptWithKey(
  payload: EncryptedPayload,
  key: CryptoKey,
): Promise<string> {
  const iv = decodeBase64(payload.iv);
  const ciphertext = decodeBase64(payload.ciphertext);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    ciphertext as BufferSource,
  );

  return new TextDecoder().decode(plaintext);
}
