import type { z } from 'zod';
import { ExportSchema } from '@/domain/plan/schemas';
import { db, clearAllData } from '@/data/db';
import type {
  Plan,
  BucketAllocation,
  TaxComponent,
  ExpenseItem,
  MonthlySnapshot,
} from '@/domain/plan/types';

export type ExportPayload = z.infer<typeof ExportSchema>;

/**
 * Parses and validates a raw JSON string against the ExportSchema.
 * Throws a descriptive error if parsing or validation fails.
 */
export function parseAndValidateImport(jsonString: string): ExportPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('Invalid JSON: the file does not contain valid JSON data.');
  }

  const result = ExportSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Validation failed: ${issues}`);
  }

  return result.data as ExportPayload;
}

/**
 * Clears all existing data and writes the imported payload
 * to Dexie in a single transaction.
 *
 * The Zod-inferred types use plain `number` for cents fields,
 * but the Dexie tables expect branded `Cents`. Since Zod has already
 * validated the data as safe integers, the cast is sound.
 */
export async function importData(payload: ExportPayload): Promise<void> {
  await clearAllData();

  await db.transaction(
    'rw',
    [db.plans, db.buckets, db.taxComponents, db.expenses, db.snapshots],
    async () => {
      await db.plans.add(payload.plan as unknown as Plan);

      if (payload.buckets.length > 0) {
        await db.buckets.bulkAdd(
          payload.buckets as unknown as BucketAllocation[],
        );
      }

      if (payload.taxComponents.length > 0) {
        await db.taxComponents.bulkAdd(
          payload.taxComponents as unknown as TaxComponent[],
        );
      }

      if (payload.expenses.length > 0) {
        await db.expenses.bulkAdd(payload.expenses as unknown as ExpenseItem[]);
      }

      if (payload.snapshots.length > 0) {
        await db.snapshots.bulkAdd(
          payload.snapshots as unknown as MonthlySnapshot[],
        );
      }
    },
  );
}
