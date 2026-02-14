import { z } from 'zod';
import type {
  Plan,
  BucketAllocation,
  TaxComponent,
  ExpenseItem,
  ExpenseAttachment,
  Goal,
  Asset,
  Liability,
  MonthlySnapshot,
  NetWorthSnapshot,
  ChangeLogEntry,
  RecurringTemplate,
} from '@/domain/plan/types';
import { SUPPORTED_CURRENCIES, type ExchangeRateRecord } from '@/domain/money';
import {
  AssetSchema,
  BucketAllocationSchema,
  CurrencyCodeSchema,
  ExpenseItemSchema,
  GoalSchema,
  LiabilitySchema,
  MonthlySnapshotSchema,
  NetWorthSnapshotSchema,
  PlanSchema,
  RecurringTemplateSchema,
  TaxComponentSchema,
} from '@/domain/plan/schemas';
import { db, clearAllData } from '@/data/db';
import type { EncryptedPayload } from '@/data/sync/encryption';
import {
  activateVaultKey,
  clearActiveVaultKey,
  decryptWithPasswordAndActivateVaultKey,
  encryptWithActiveVaultKey,
  hasActiveVaultKey,
} from './vault-key-manager';

export const VAULT_VERSION = 1 as const;

interface SerializableAttachment {
  readonly id: string;
  readonly planId: string;
  readonly expenseId: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly size: number;
  readonly blobBase64: string;
  readonly createdAt: string;
}

export interface VaultPayload {
  readonly version: typeof VAULT_VERSION;
  readonly exportedAt: string;
  readonly plans: Plan[];
  readonly buckets: BucketAllocation[];
  readonly taxComponents: TaxComponent[];
  readonly expenses: ExpenseItem[];
  readonly attachments: SerializableAttachment[];
  readonly goals: Goal[];
  readonly assets: Asset[];
  readonly liabilities: Liability[];
  readonly snapshots: MonthlySnapshot[];
  readonly netWorthSnapshots: NetWorthSnapshot[];
  readonly changelog: ChangeLogEntry[];
  readonly recurringTemplates: RecurringTemplate[];
  readonly exchangeRates: ExchangeRateRecord[];
}

const EncryptedPayloadSchema = z.object({
  iv: z.string().min(1),
  ciphertext: z.string().min(1),
  salt: z.string().min(1),
});

const SerializableAttachmentSchema = z.object({
  id: z.string().uuid(),
  planId: z.string().uuid(),
  expenseId: z.string().uuid(),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  size: z.number().int().nonnegative(),
  blobBase64: z.string(),
  createdAt: z.string().datetime(),
});

const ChangeLogEntrySchema = z.object({
  id: z.string().uuid(),
  planId: z.string().uuid(),
  entityType: z.enum([
    'plan',
    'expense',
    'bucket',
    'tax_component',
    'snapshot',
    'goal',
    'asset',
    'liability',
    'net_worth_snapshot',
    'recurring_template',
  ]),
  entityId: z.string(),
  operation: z.enum(['create', 'update', 'delete']),
  timestamp: z.string().datetime(),
  payload: z.string().optional(),
});

const ExchangeRateRecordSchema = z
  .object({
    id: z.string().uuid(),
    planId: z.string().uuid(),
    baseCurrency: CurrencyCodeSchema,
    rates: z.record(z.string(), z.number().positive()),
    updatedAt: z.string().datetime(),
  })
  .superRefine((value, ctx) => {
    for (const code of Object.keys(value.rates)) {
      if (
        !SUPPORTED_CURRENCIES.includes(
          code as (typeof SUPPORTED_CURRENCIES)[number],
        )
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['rates', code],
          message: `Unsupported currency code: ${code}`,
        });
      }
    }
  });

const VaultPayloadSchema = z.object({
  version: z.number().int().positive(),
  exportedAt: z.string().datetime(),
  plans: z.array(PlanSchema),
  buckets: z.array(BucketAllocationSchema),
  taxComponents: z.array(TaxComponentSchema),
  expenses: z.array(ExpenseItemSchema),
  attachments: z.array(SerializableAttachmentSchema),
  goals: z.array(GoalSchema),
  assets: z.array(AssetSchema),
  liabilities: z.array(LiabilitySchema),
  snapshots: z.array(MonthlySnapshotSchema),
  netWorthSnapshots: z.array(NetWorthSnapshotSchema),
  changelog: z.array(ChangeLogEntrySchema),
  recurringTemplates: z.array(RecurringTemplateSchema),
  exchangeRates: z.array(ExchangeRateRecordSchema),
});

function formatSchemaError(error: z.ZodError): string {
  return error.issues
    .slice(0, 4)
    .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
    .join('; ');
}

function encodeBase64(bytes: Uint8Array): string {
  const nodeBuffer = (
    globalThis as {
      Buffer?: {
        from: (
          data: Uint8Array | string,
          encoding?: string,
        ) => Uint8Array & { toString: (encoding: string) => string };
      };
    }
  ).Buffer;
  if (typeof btoa === 'function') {
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  }
  if (nodeBuffer) {
    return nodeBuffer.from(bytes).toString('base64');
  }
  throw new Error('Base64 encoding not supported in this environment.');
}

function decodeBase64(base64: string): Uint8Array {
  const nodeBuffer = (
    globalThis as {
      Buffer?: {
        from: (data: string, encoding: string) => Uint8Array;
      };
    }
  ).Buffer;
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  if (nodeBuffer) {
    return nodeBuffer.from(base64, 'base64');
  }
  throw new Error('Base64 decoding not supported in this environment.');
}

async function blobToBase64(blob: Blob): Promise<string> {
  if (typeof blob.arrayBuffer === 'function') {
    return encodeBase64(new Uint8Array(await blob.arrayBuffer()));
  }
  const blobAny = blob as Blob & { _buffer?: ArrayBuffer | Uint8Array };
  if (blobAny._buffer) {
    const buffer =
      blobAny._buffer instanceof Uint8Array
        ? blobAny._buffer
        : new Uint8Array(blobAny._buffer);
    return encodeBase64(buffer);
  }
  // Fallback to FileReader for browsers that don't support arrayBuffer().
  if (typeof FileReader !== 'undefined') {
    const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () =>
        reject(reader.error ?? new Error('Failed to read blob data.'));
      reader.readAsArrayBuffer(blob);
    });
    return encodeBase64(new Uint8Array(buffer));
  }
  if (typeof Response !== 'undefined') {
    return encodeBase64(new Uint8Array(await new Response(blob).arrayBuffer()));
  }
  throw new Error('Blob arrayBuffer is not supported in this environment.');
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  if (!base64) {
    return new Blob([], { type: mimeType });
  }
  const bytes = decodeBase64(base64);
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return new Blob([copy.buffer], { type: mimeType });
}

export async function buildVaultPayload(): Promise<VaultPayload> {
  const [
    plans,
    buckets,
    taxComponents,
    expenses,
    rawAttachments,
    goals,
    assets,
    liabilities,
    snapshots,
    netWorthSnapshots,
    changelog,
    recurringTemplates,
    exchangeRates,
  ] = await Promise.all([
    db.plans.toArray(),
    db.buckets.toArray(),
    db.taxComponents.toArray(),
    db.expenses.toArray(),
    db.attachments.toArray(),
    db.goals.toArray(),
    db.assets.toArray(),
    db.liabilities.toArray(),
    db.snapshots.toArray(),
    db.netWorthSnapshots.toArray(),
    db.changelog.toArray(),
    db.recurringTemplates.toArray(),
    db.exchangeRates.toArray(),
  ]);

  const attachments: SerializableAttachment[] = await Promise.all(
    rawAttachments.map(async (attachment) => ({
      id: attachment.id,
      planId: attachment.planId,
      expenseId: attachment.expenseId,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      size: attachment.size,
      blobBase64: attachment.blob ? await blobToBase64(attachment.blob) : '',
      createdAt: attachment.createdAt,
    })),
  );

  return {
    version: VAULT_VERSION,
    exportedAt: new Date().toISOString(),
    plans,
    buckets,
    taxComponents,
    expenses,
    attachments,
    goals,
    assets,
    liabilities,
    snapshots,
    netWorthSnapshots,
    changelog,
    recurringTemplates,
    exchangeRates,
  };
}

export async function restoreVaultPayload(
  payload: VaultPayload,
): Promise<void> {
  await clearAllData({ keepVault: true });

  const restoredAttachments: ExpenseAttachment[] = payload.attachments.map(
    (attachment) => ({
      id: attachment.id,
      planId: attachment.planId,
      expenseId: attachment.expenseId,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      size: attachment.size,
      blob: base64ToBlob(attachment.blobBase64, attachment.mimeType),
      createdAt: attachment.createdAt,
    }),
  );

  await db.transaction(
    'rw',
    [
      db.plans,
      db.buckets,
      db.taxComponents,
      db.expenses,
      db.attachments,
      db.goals,
      db.assets,
      db.liabilities,
      db.snapshots,
      db.netWorthSnapshots,
      db.changelog,
      db.recurringTemplates,
      db.exchangeRates,
    ],
    async () => {
      if (payload.plans.length > 0) {
        await db.plans.bulkPut(payload.plans);
      }
      if (payload.buckets.length > 0) {
        await db.buckets.bulkPut(payload.buckets);
      }
      if (payload.taxComponents.length > 0) {
        await db.taxComponents.bulkPut(payload.taxComponents);
      }
      if (payload.expenses.length > 0) {
        await db.expenses.bulkPut(payload.expenses);
      }
      if (restoredAttachments.length > 0) {
        await db.attachments.bulkPut(restoredAttachments);
      }
      if (payload.goals.length > 0) {
        await db.goals.bulkPut(payload.goals);
      }
      if (payload.assets.length > 0) {
        await db.assets.bulkPut(payload.assets);
      }
      if (payload.liabilities.length > 0) {
        await db.liabilities.bulkPut(payload.liabilities);
      }
      if (payload.snapshots.length > 0) {
        await db.snapshots.bulkPut(payload.snapshots);
      }
      if (payload.netWorthSnapshots.length > 0) {
        await db.netWorthSnapshots.bulkPut(payload.netWorthSnapshots);
      }
      if (payload.changelog.length > 0) {
        await db.changelog.bulkPut(payload.changelog);
      }
      if (payload.recurringTemplates.length > 0) {
        await db.recurringTemplates.bulkPut(payload.recurringTemplates);
      }
      if (payload.exchangeRates.length > 0) {
        await db.exchangeRates.bulkPut(payload.exchangeRates);
      }
    },
  );
}

export async function encryptVaultPayload(
  payload: VaultPayload,
  password?: string,
): Promise<string> {
  if (password) {
    await activateVaultKey(password);
  }
  const encrypted = await encryptWithActiveVaultKey(JSON.stringify(payload));
  return JSON.stringify(encrypted);
}

export async function decryptVaultPayload(
  payload: string,
  password: string,
): Promise<VaultPayload> {
  let encryptedUnknown: unknown;
  try {
    encryptedUnknown = JSON.parse(payload);
  } catch {
    throw new Error('Invalid encrypted vault payload JSON.');
  }

  const encryptedResult = EncryptedPayloadSchema.safeParse(encryptedUnknown);
  if (!encryptedResult.success) {
    throw new Error(
      `Invalid encrypted vault payload structure: ${formatSchemaError(
        encryptedResult.error,
      )}`,
    );
  }

  const decrypted = await decryptWithPasswordAndActivateVaultKey(
    encryptedResult.data as EncryptedPayload,
    password,
  );

  let dataUnknown: unknown;
  try {
    dataUnknown = JSON.parse(decrypted);
  } catch {
    throw new Error('Invalid decrypted vault JSON.');
  }

  const result = VaultPayloadSchema.safeParse(dataUnknown);
  if (!result.success) {
    clearActiveVaultKey();
    throw new Error(
      `Invalid vault payload structure: ${formatSchemaError(result.error)}`,
    );
  }
  const data = result.data;

  if (data.version !== VAULT_VERSION) {
    clearActiveVaultKey();
    throw new Error(
      `Vault version mismatch: expected ${VAULT_VERSION}, got ${data.version}. A future update may be required to read this vault.`,
    );
  }

  return data as unknown as VaultPayload;
}

export { clearActiveVaultKey as clearVaultKey, hasActiveVaultKey };
