import { db } from '@/data/db';
import type { EncryptedVaultRecord } from './types';

const VAULT_ID = 'default';

export const vaultRepo = {
  async get(): Promise<EncryptedVaultRecord | undefined> {
    return db.vault.get(VAULT_ID);
  },

  async set(payload: string): Promise<void> {
    const now = new Date().toISOString();
    const existing = await db.vault.get(VAULT_ID);
    const record: EncryptedVaultRecord = {
      id: VAULT_ID,
      payload,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await db.vault.put(record);
  },

  async clear(): Promise<void> {
    await db.vault.clear();
  },
};
