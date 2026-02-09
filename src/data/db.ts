import Dexie from 'dexie';
import type { Table } from 'dexie';
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
} from '@/domain/plan/types';

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

  constructor() {
    super('TalliofiDB');

    this.version(1).stores({
      plans: 'id, name, createdAt, updatedAt',
      buckets: 'id, planId, sortOrder',
      taxComponents: 'id, planId, sortOrder',
      expenses: 'id, planId, bucketId, category, frequency, createdAt',
      snapshots: 'id, planId, yearMonth, [planId+yearMonth]',
      changelog: 'id, planId, timestamp, entityType',
    });

    // Version 2: Add goals table
    this.version(2).stores({
      plans: 'id, name, createdAt, updatedAt',
      buckets: 'id, planId, sortOrder',
      taxComponents: 'id, planId, sortOrder',
      expenses: 'id, planId, bucketId, category, frequency, createdAt',
      goals: 'id, planId, type, isCompleted, createdAt',
      snapshots: 'id, planId, yearMonth, [planId+yearMonth]',
      changelog: 'id, planId, timestamp, entityType',
    });

    // Version 3: Add assets, liabilities, and net worth snapshots tables
    this.version(3).stores({
      plans: 'id, name, createdAt, updatedAt',
      buckets: 'id, planId, sortOrder',
      taxComponents: 'id, planId, sortOrder',
      expenses: 'id, planId, bucketId, category, frequency, createdAt',
      goals: 'id, planId, type, isCompleted, createdAt',
      assets: 'id, planId, category, createdAt',
      liabilities: 'id, planId, category, createdAt',
      snapshots: 'id, planId, yearMonth, [planId+yearMonth]',
      netWorthSnapshots: 'id, planId, yearMonth, [planId+yearMonth]',
      changelog: 'id, planId, timestamp, entityType',
    });

    // Version 4: Add transactionDate index to expenses for date filtering/sorting
    this.version(4).stores({
      plans: 'id, name, createdAt, updatedAt',
      buckets: 'id, planId, sortOrder',
      taxComponents: 'id, planId, sortOrder',
      expenses:
        'id, planId, bucketId, category, frequency, transactionDate, createdAt',
      goals: 'id, planId, type, isCompleted, createdAt',
      assets: 'id, planId, category, createdAt',
      liabilities: 'id, planId, category, createdAt',
      snapshots: 'id, planId, yearMonth, [planId+yearMonth]',
      netWorthSnapshots: 'id, planId, yearMonth, [planId+yearMonth]',
      changelog: 'id, planId, timestamp, entityType',
    });

    // Version 5: Add recurring templates table
    this.version(5).stores({
      plans: 'id, name, createdAt, updatedAt',
      buckets: 'id, planId, sortOrder',
      taxComponents: 'id, planId, sortOrder',
      expenses:
        'id, planId, bucketId, category, frequency, transactionDate, createdAt',
      goals: 'id, planId, type, isCompleted, createdAt',
      assets: 'id, planId, category, createdAt',
      liabilities: 'id, planId, category, createdAt',
      snapshots: 'id, planId, yearMonth, [planId+yearMonth]',
      netWorthSnapshots: 'id, planId, yearMonth, [planId+yearMonth]',
      changelog: 'id, planId, timestamp, entityType',
      recurringTemplates: 'id, planId, isActive, dayOfMonth, createdAt',
    });
  }
}

export const db = new TalliofiDatabase();

export async function clearAllData(): Promise<void> {
  await db.transaction(
    'rw',
    [
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
    ],
    async () => {
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
    },
  );
}
