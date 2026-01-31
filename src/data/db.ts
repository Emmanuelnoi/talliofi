import Dexie from 'dexie';
import type { Table } from 'dexie';
import type {
  Plan,
  BucketAllocation,
  TaxComponent,
  ExpenseItem,
  MonthlySnapshot,
  ChangeLogEntry,
} from '@/domain/plan/types';

export class TalliofiDatabase extends Dexie {
  plans!: Table<Plan, string>;
  buckets!: Table<BucketAllocation, string>;
  taxComponents!: Table<TaxComponent, string>;
  expenses!: Table<ExpenseItem, string>;
  snapshots!: Table<MonthlySnapshot, string>;
  changelog!: Table<ChangeLogEntry, string>;

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
      db.snapshots,
      db.changelog,
    ],
    async () => {
      await db.plans.clear();
      await db.buckets.clear();
      await db.taxComponents.clear();
      await db.expenses.clear();
      await db.snapshots.clear();
      await db.changelog.clear();
    },
  );
}
