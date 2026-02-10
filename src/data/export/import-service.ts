import type { z } from 'zod';
import {
  ExportSchema,
  PlanSchema,
  BucketAllocationSchema,
  TaxComponentSchema,
  ExpenseItemSchema,
} from '@/domain/plan/schemas';
import { db, clearAllData } from '@/data/db';
import { cents } from '@/domain/money';
import type {
  Plan,
  BucketAllocation,
  TaxComponent,
  ExpenseItem,
  MonthlySnapshot,
  BucketSummary,
} from '@/domain/plan/types';

export type ExportPayload = z.infer<typeof ExportSchema>;

// --- Type Mappers ---
// These functions safely convert Zod-inferred types (with plain numbers)
// to domain types (with branded Cents). Zod has already validated these
// as safe integers, so the conversion is sound.

type RawPlan = z.infer<typeof PlanSchema>;
type RawBucket = z.infer<typeof BucketAllocationSchema>;
type RawTaxComponent = z.infer<typeof TaxComponentSchema>;
type RawExpense = z.infer<typeof ExpenseItemSchema>;
type RawSnapshot = ExportPayload['snapshots'][number];
type RawBucketSummary = RawSnapshot['bucketSummaries'][number];

/**
 * Converts a Zod-validated plan to the domain Plan type.
 * Safely brands numeric cents values.
 */
function toPlan(raw: RawPlan): Plan {
  return {
    id: raw.id,
    name: raw.name,
    grossIncomeCents: cents(raw.grossIncomeCents),
    incomeFrequency: raw.incomeFrequency,
    taxMode: raw.taxMode,
    taxEffectiveRate: raw.taxEffectiveRate,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    version: raw.version,
  };
}

/**
 * Converts a Zod-validated bucket to the domain BucketAllocation type.
 * Safely brands numeric cents values.
 */
function toBucketAllocation(raw: RawBucket): BucketAllocation {
  return {
    id: raw.id,
    planId: raw.planId,
    name: raw.name,
    color: raw.color,
    mode: raw.mode,
    targetPercentage: raw.targetPercentage,
    targetAmountCents:
      raw.targetAmountCents !== undefined
        ? cents(raw.targetAmountCents)
        : undefined,
    rolloverEnabled: raw.rolloverEnabled ?? false,
    sortOrder: raw.sortOrder,
    createdAt: raw.createdAt,
  };
}

/**
 * Converts a Zod-validated tax component to the domain TaxComponent type.
 */
function toTaxComponent(raw: RawTaxComponent): TaxComponent {
  return {
    id: raw.id,
    planId: raw.planId,
    name: raw.name,
    ratePercent: raw.ratePercent,
    sortOrder: raw.sortOrder,
  };
}

/**
 * Converts a Zod-validated expense to the domain ExpenseItem type.
 * Safely brands numeric cents values.
 */
function toExpenseItem(raw: RawExpense): ExpenseItem {
  return {
    id: raw.id,
    planId: raw.planId,
    bucketId: raw.bucketId,
    name: raw.name,
    amountCents: cents(raw.amountCents),
    frequency: raw.frequency,
    category: raw.category,
    isFixed: raw.isFixed,
    notes: raw.notes,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

/**
 * Converts a Zod-validated bucket summary to the domain BucketSummary type.
 * Safely brands numeric cents values.
 */
function toBucketSummary(raw: RawBucketSummary): BucketSummary {
  return {
    bucketId: raw.bucketId,
    bucketName: raw.bucketName,
    allocatedCents: cents(raw.allocatedCents),
    spentCents: cents(raw.spentCents),
    remainingCents: cents(raw.remainingCents),
  };
}

/**
 * Converts a Zod-validated snapshot to the domain MonthlySnapshot type.
 * Safely brands numeric cents values.
 */
function toMonthlySnapshot(raw: RawSnapshot): MonthlySnapshot {
  return {
    id: raw.id,
    planId: raw.planId,
    yearMonth: raw.yearMonth,
    grossIncomeCents: cents(raw.grossIncomeCents),
    netIncomeCents: cents(raw.netIncomeCents),
    totalExpensesCents: cents(raw.totalExpensesCents),
    bucketSummaries: raw.bucketSummaries.map(toBucketSummary),
    createdAt: raw.createdAt,
  };
}

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

  return result.data;
}

/**
 * Clears all existing data and writes the imported payload
 * to Dexie in a single transaction.
 *
 * Uses type mapper functions to safely convert Zod-inferred types
 * (with plain numbers) to domain types (with branded Cents).
 */
export async function importData(payload: ExportPayload): Promise<void> {
  await clearAllData();

  await db.transaction(
    'rw',
    [db.plans, db.buckets, db.taxComponents, db.expenses, db.snapshots],
    async () => {
      await db.plans.add(toPlan(payload.plan));

      if (payload.buckets.length > 0) {
        await db.buckets.bulkAdd(payload.buckets.map(toBucketAllocation));
      }

      if (payload.taxComponents.length > 0) {
        await db.taxComponents.bulkAdd(
          payload.taxComponents.map(toTaxComponent),
        );
      }

      if (payload.expenses.length > 0) {
        await db.expenses.bulkAdd(payload.expenses.map(toExpenseItem));
      }

      if (payload.snapshots.length > 0) {
        await db.snapshots.bulkAdd(payload.snapshots.map(toMonthlySnapshot));
      }
    },
  );
}
