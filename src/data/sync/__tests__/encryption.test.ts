import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, deriveKey } from '../encryption';

describe('encryption', () => {
  const TEST_PASSWORD = 'correct-horse-battery-staple';
  const TEST_DATA = 'Hello, encrypted world! {"amount": 42}';

  it('encrypt and decrypt round-trip', async () => {
    const payload = await encrypt(TEST_DATA, TEST_PASSWORD);
    const result = await decrypt(payload, TEST_PASSWORD);
    expect(result).toBe(TEST_DATA);
  });

  it('encrypts empty strings correctly', async () => {
    const payload = await encrypt('', TEST_PASSWORD);
    const result = await decrypt(payload, TEST_PASSWORD);
    expect(result).toBe('');
  });

  it('encrypts unicode strings correctly', async () => {
    const unicode = 'Talliofi -- financial planning';
    const payload = await encrypt(unicode, TEST_PASSWORD);
    const result = await decrypt(payload, TEST_PASSWORD);
    expect(result).toBe(unicode);
  });

  it('different passwords produce different ciphertext', async () => {
    const payload1 = await encrypt(TEST_DATA, 'password-one');
    const payload2 = await encrypt(TEST_DATA, 'password-two');

    // Ciphertexts should differ (different salt, iv, and key)
    expect(payload1.ciphertext).not.toBe(payload2.ciphertext);
  });

  it('tampered ciphertext fails decryption', async () => {
    const payload = await encrypt(TEST_DATA, TEST_PASSWORD);

    // Corrupt the ciphertext by changing a character
    const tampered = {
      ...payload,
      ciphertext: payload.ciphertext.slice(0, -4) + 'XXXX',
    };

    await expect(decrypt(tampered, TEST_PASSWORD)).rejects.toThrow();
  });

  it('wrong password fails decryption', async () => {
    const payload = await encrypt(TEST_DATA, TEST_PASSWORD);
    await expect(decrypt(payload, 'wrong-password')).rejects.toThrow();
  });

  it('key derivation is deterministic with same password and salt', async () => {
    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);

    // Derive two keys from the same password + salt
    const key1 = await deriveKey(TEST_PASSWORD, salt);
    const key2 = await deriveKey(TEST_PASSWORD, salt);

    // Encrypt the same data with the same IV to prove keys are identical
    const iv = new Uint8Array(12);
    crypto.getRandomValues(iv);
    const encoder = new TextEncoder();
    const data = encoder.encode('determinism-check');

    const ct1 = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key1,
      data,
    );
    const ct2 = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key2,
      data,
    );

    expect(new Uint8Array(ct1)).toEqual(new Uint8Array(ct2));
  });
});
