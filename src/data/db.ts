import Dexie from 'dexie';
import type { Table } from 'dexie';
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
import type { ExchangeRateRecord } from '@/domain/money';
import type { EncryptedVaultRecord } from './local-encryption/types';

export class TalliofiDatabase extends Dexie {
  plans!: Table<Plan, string>;
  buckets!: Table<BucketAllocation, string>;
  taxComponents!: Table<TaxComponent, string>;
  expenses!: Table<ExpenseItem, string>;
  goals!: Table<Goal, string>;
  assets!: Table<Asset, string>;
  liabilities!: Table<Liability, string>;
  snapshots!: Table<MonthlySnapshot, string>;
  netWorthSnapshots!: Table<NetWorthSnapshot, string>;
  changelog!: Table<ChangeLogEntry, string>;
  recurringTemplates!: Table<RecurringTemplate, string>;
  attachments!: Table<ExpenseAttachment, string>;
  exchangeRates!: Table<ExchangeRateRecord, string>;
  vault!: Table<EncryptedVaultRecord, string>;

  constructor() {
    super('TalliofiDB');

    // Build schema incrementally — each version only specifies what changed
    let schema: Record<string, string> = {
      plans: 'id, name, createdAt, updatedAt',
      buckets: 'id, planId, sortOrder',
      taxComponents: 'id, planId, sortOrder',
      expenses: 'id, planId, bucketId, category, frequency, createdAt',
      snapshots: 'id, planId, yearMonth, [planId+yearMonth]',
      changelog: 'id, planId, timestamp, entityType',
    };

    this.version(1).stores(schema);

    // V2: Add goals table
    schema = { ...schema, goals: 'id, planId, type, isCompleted, createdAt' };
    this.version(2).stores(schema);

    // V3: Add assets, liabilities, and net worth snapshots tables
    schema = {
      ...schema,
      assets: 'id, planId, category, createdAt',
      liabilities: 'id, planId, category, createdAt',
      netWorthSnapshots: 'id, planId, yearMonth, [planId+yearMonth]',
    };
    this.version(3).stores(schema);

    // V4: Add transactionDate index to expenses for date filtering/sorting
    schema = {
      ...schema,
      expenses:
        'id, planId, bucketId, category, frequency, transactionDate, createdAt',
    };
    this.version(4).stores(schema);

    // V5: Add recurring templates table
    schema = {
      ...schema,
      recurringTemplates: 'id, planId, isActive, dayOfMonth, createdAt',
    };
    this.version(5).stores(schema);

    // V6: Add encrypted vault table for local encryption
    schema = { ...schema, vault: 'id, updatedAt' };
    this.version(6).stores(schema);

    // V7: Add expense attachments table
    schema = { ...schema, attachments: 'id, planId, expenseId, createdAt' };
    this.version(7).stores(schema);

    // V8: Add exchange rates table for multi-currency support
    schema = {
      ...schema,
      exchangeRates: 'id, planId, baseCurrency, updatedAt',
    };
    this.version(8)
      .stores(schema)
      .upgrade(async () => {
        // Template for future data migrations.
      });

    // V9: Add compound [planId+transactionDate] index to expenses for efficient date range queries
    schema = {
      ...schema,
      expenses:
        'id, planId, bucketId, category, frequency, transactionDate, [planId+transactionDate], createdAt',
    };
    this.version(9).stores(schema);
  }
}

export const db = new TalliofiDatabase();

export async function clearAllData(options?: {
  keepVault?: boolean;
}): Promise<void> {
  const keepVault = options?.keepVault ?? false;
  const tables = [
    db.plans,
    db.buckets,
    db.taxComponents,
    db.expenses,
    db.goals,
    db.assets,
    db.liabilities,
    db.snapshots,
    db.netWorthSnapshots,
    db.changelog,
    db.recurringTemplates,
    db.attachments,
    db.exchangeRates,
    ...(keepVault ? [] : [db.vault]),
  ];

  await db.transaction('rw', tables, async () => {
    await db.plans.clear();
    await db.buckets.clear();
    await db.taxComponents.clear();
    await db.expenses.clear();
    await db.goals.clear();
    await db.assets.clear();
    await db.liabilities.clear();
    await db.snapshots.clear();
    await db.netWorthSnapshots.clear();
    await db.changelog.clear();
    await db.recurringTemplates.clear();
    await db.attachments.clear();
    await db.exchangeRates.clear();
    if (!keepVault) {
      await db.vault.clear();
    }
  });
}
