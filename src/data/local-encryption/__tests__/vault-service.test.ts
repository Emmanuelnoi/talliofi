import { beforeEach, describe, expect, it } from 'vitest';
import {
  VAULT_VERSION,
  buildVaultPayload,
  decryptVaultPayload,
  encryptVaultPayload,
  restoreVaultPayload,
  type VaultPayload,
} from '../vault-service';
import { db, clearAllData } from '@/data/db';
import { cents } from '@/domain/money';
import type {
  Plan,
  BucketAllocation,
  TaxComponent,
  ExpenseItem,
  Goal,
  Asset,
  Liability,
  MonthlySnapshot,
  NetWorthSnapshot,
  ChangeLogEntry,
  RecurringTemplate,
  ExpenseAttachment,
} from '@/domain/plan/types';
import type { ExchangeRateRecord } from '@/domain/money';

const NOW = '2026-01-01T00:00:00Z';

function encodeBase64(bytes: Uint8Array): string {
  if (typeof btoa !== 'function') {
    throw new Error('Base64 encoding not available in this environment.');
  }
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

async function readBlobAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') {
    return blob.arrayBuffer();
  }
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () =>
        reject(reader.error ?? new Error('Failed to read blob data.'));
      reader.readAsArrayBuffer(blob);
    });
  }
  throw new Error('Blob arrayBuffer not supported in this environment.');
}

function createEmptyPayload(): VaultPayload {
  return {
    version: VAULT_VERSION,
    exportedAt: NOW,
    plans: [],
    buckets: [],
    taxComponents: [],
    expenses: [],
    attachments: [],
    goals: [],
    assets: [],
    liabilities: [],
    snapshots: [],
    netWorthSnapshots: [],
    changelog: [],
    recurringTemplates: [],
    exchangeRates: [],
  };
}

async function seedVaultData() {
  const planId = '11111111-1111-4111-8111-111111111111';
  const bucketId = '22222222-2222-4222-8222-222222222222';
  const expenseId = '33333333-3333-4333-8333-333333333333';
  const attachmentId = '44444444-4444-4444-8444-444444444444';

  const plan: Plan = {
    id: planId,
    name: 'Test Plan',
    grossIncomeCents: cents(500_000),
    incomeFrequency: 'monthly',
    taxMode: 'simple',
    taxEffectiveRate: 25,
    currencyCode: 'USD',
    createdAt: NOW,
    updatedAt: NOW,
    version: 1,
  };

  const bucket: BucketAllocation = {
    id: bucketId,
    planId,
    name: 'Essentials',
    color: '#4A90D9',
    mode: 'percentage',
    targetPercentage: 50,
    sortOrder: 0,
    createdAt: NOW,
  };

  const taxComponent: TaxComponent = {
    id: '55555555-5555-4555-8555-555555555555',
    planId,
    name: 'Federal',
    ratePercent: 10,
    sortOrder: 0,
  };

  const expense: ExpenseItem = {
    id: expenseId,
    planId,
    bucketId,
    name: 'Rent',
    amountCents: cents(150_000),
    frequency: 'monthly',
    category: 'housing',
    isFixed: true,
    transactionDate: '2026-01-05',
    createdAt: NOW,
    updatedAt: NOW,
  };

  const attachmentBytes = Uint8Array.from([1, 2, 3, 4]);
  const attachment: ExpenseAttachment = {
    id: attachmentId,
    planId,
    expenseId,
    fileName: 'receipt.png',
    mimeType: 'image/png',
    size: attachmentBytes.length,
    blob: new Blob([attachmentBytes], { type: 'image/png' }),
    createdAt: NOW,
  };

  const goal: Goal = {
    id: '66666666-6666-4666-8666-666666666666',
    planId,
    name: 'Emergency Fund',
    type: 'savings',
    targetAmountCents: cents(1_000_000),
    currentAmountCents: cents(250_000),
    color: '#50C878',
    isCompleted: false,
    createdAt: NOW,
    updatedAt: NOW,
  };

  const asset: Asset = {
    id: '77777777-7777-4777-8777-777777777777',
    planId,
    name: 'Savings Account',
    category: 'cash',
    valueCents: cents(300_000),
    createdAt: NOW,
    updatedAt: NOW,
  };

  const liability: Liability = {
    id: '88888888-8888-4888-8888-888888888888',
    planId,
    name: 'Credit Card',
    category: 'credit_card',
    balanceCents: cents(50_000),
    interestRate: 19.99,
    minimumPaymentCents: cents(2_500),
    createdAt: NOW,
    updatedAt: NOW,
  };

  const snapshot: MonthlySnapshot = {
    id: '99999999-9999-4999-8999-999999999999',
    planId,
    yearMonth: '2026-01',
    grossIncomeCents: cents(500_000),
    netIncomeCents: cents(400_000),
    totalExpensesCents: cents(200_000),
    bucketSummaries: [
      {
        bucketId,
        bucketName: 'Essentials',
        allocatedCents: cents(250_000),
        spentCents: cents(200_000),
        remainingCents: cents(50_000),
      },
    ],
    createdAt: NOW,
  };

  const netWorthSnapshot: NetWorthSnapshot = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    planId,
    yearMonth: '2026-01',
    totalAssetsCents: cents(300_000),
    totalLiabilitiesCents: cents(50_000),
    netWorthCents: cents(250_000),
    assetBreakdown: [
      { category: 'cash', totalCents: cents(300_000), count: 1 },
    ],
    liabilityBreakdown: [
      { category: 'credit_card', totalCents: cents(50_000), count: 1 },
    ],
    createdAt: NOW,
  };

  const changelog: ChangeLogEntry = {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    planId,
    entityType: 'expense',
    entityId: expenseId,
    operation: 'create',
    timestamp: NOW,
    payload: JSON.stringify({ name: 'Rent' }),
  };

  const recurringTemplate: RecurringTemplate = {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    planId,
    name: 'Gym Membership',
    amountCents: cents(4_500),
    frequency: 'monthly',
    category: 'healthcare',
    bucketId,
    isActive: true,
    isFixed: true,
    createdAt: NOW,
    updatedAt: NOW,
  };

  const exchangeRate: ExchangeRateRecord = {
    id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    planId,
    baseCurrency: 'USD',
    rates: { EUR: 0.92 },
    updatedAt: NOW,
  };

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
      await db.plans.add(plan);
      await db.buckets.add(bucket);
      await db.taxComponents.add(taxComponent);
      await db.expenses.add(expense);
      await db.attachments.add(attachment);
      await db.goals.add(goal);
      await db.assets.add(asset);
      await db.liabilities.add(liability);
      await db.snapshots.add(snapshot);
      await db.netWorthSnapshots.add(netWorthSnapshot);
      await db.changelog.add(changelog);
      await db.recurringTemplates.add(recurringTemplate);
      await db.exchangeRates.add(exchangeRate);
    },
  );

  return { planId, bucketId, expenseId, attachmentId, attachmentBytes };
}

describe('vault-service', () => {
  beforeEach(async () => {
    await clearAllData();
  });

  it('buildVaultPayload returns all tables', async () => {
    const { attachmentBytes } = await seedVaultData();

    const payload = await buildVaultPayload();

    expect(payload.version).toBe(VAULT_VERSION);
    expect(payload.plans).toHaveLength(1);
    expect(payload.buckets).toHaveLength(1);
    expect(payload.taxComponents).toHaveLength(1);
    expect(payload.expenses).toHaveLength(1);
    expect(payload.attachments).toHaveLength(1);
    expect(payload.goals).toHaveLength(1);
    expect(payload.assets).toHaveLength(1);
    expect(payload.liabilities).toHaveLength(1);
    expect(payload.snapshots).toHaveLength(1);
    expect(payload.netWorthSnapshots).toHaveLength(1);
    expect(payload.changelog).toHaveLength(1);
    expect(payload.recurringTemplates).toHaveLength(1);
    expect(payload.exchangeRates).toHaveLength(1);

    const expectedBase64 = encodeBase64(attachmentBytes);
    expect(payload.attachments[0]?.blobBase64).toBe(expectedBase64);
  });

  it('restoreVaultPayload writes all data back', async () => {
    const { attachmentBytes, planId } = await seedVaultData();
    const payload = await buildVaultPayload();

    await clearAllData();
    await restoreVaultPayload(payload);

    const restoredPlan = await db.plans.get(planId);
    const restoredAttachments = await db.attachments.toArray();

    expect(restoredPlan?.name).toBe('Test Plan');
    expect(restoredAttachments).toHaveLength(1);

    const restoredBlob = restoredAttachments[0]?.blob;
    const buffer = restoredBlob
      ? await readBlobAsArrayBuffer(restoredBlob)
      : new ArrayBuffer(0);
    const restoredBytes = new Uint8Array(buffer);
    expect(Array.from(restoredBytes)).toEqual(Array.from(attachmentBytes));
  });

  it('encrypt then decrypt round-trips correctly', async () => {
    const payload: VaultPayload = {
      ...createEmptyPayload(),
      plans: [
        {
          id: '12121212-1212-4121-8121-121212121212',
          name: 'Round Trip',
          grossIncomeCents: cents(200_000),
          incomeFrequency: 'monthly',
          taxMode: 'simple',
          taxEffectiveRate: 20,
          currencyCode: 'USD',
          createdAt: NOW,
          updatedAt: NOW,
          version: 1,
        },
      ],
    };

    const encrypted = await encryptVaultPayload(payload, 'password-123');
    const decrypted = await decryptVaultPayload(encrypted, 'password-123');

    expect(decrypted).toEqual(payload);
  });

  it('decrypt with wrong password throws', async () => {
    const payload = createEmptyPayload();
    const encrypted = await encryptVaultPayload(payload, 'correct-password');

    await expect(
      decryptVaultPayload(encrypted, 'wrong-password'),
    ).rejects.toThrow();
  });

  it('restoreVaultPayload clears existing data but keeps vault', async () => {
    await db.plans.add({
      id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      name: 'Old Plan',
      grossIncomeCents: cents(100_000),
      incomeFrequency: 'monthly',
      taxMode: 'simple',
      taxEffectiveRate: 10,
      createdAt: NOW,
      updatedAt: NOW,
      version: 1,
    });

    await db.vault.add({
      id: 'vault-1',
      payload: 'encrypted',
      createdAt: NOW,
      updatedAt: NOW,
    });

    const payload: VaultPayload = {
      ...createEmptyPayload(),
      plans: [
        {
          id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
          name: 'New Plan',
          grossIncomeCents: cents(300_000),
          incomeFrequency: 'monthly',
          taxMode: 'simple',
          taxEffectiveRate: 15,
          createdAt: NOW,
          updatedAt: NOW,
          version: 1,
        },
      ],
    };

    await restoreVaultPayload(payload);

    const plans = await db.plans.toArray();
    const vaults = await db.vault.toArray();

    expect(plans).toHaveLength(1);
    expect(plans[0]?.id).toBe('ffffffff-ffff-4fff-8fff-ffffffffffff');
    expect(vaults).toHaveLength(1);
    expect(vaults[0]?.id).toBe('vault-1');
  });
});
