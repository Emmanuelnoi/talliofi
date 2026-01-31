import { z } from 'zod';

export const CentsSchema = z.number().int().safe();

export const FrequencySchema = z.enum([
  'weekly',
  'biweekly',
  'semimonthly',
  'monthly',
  'quarterly',
  'annual',
]);

export const ExpenseCategorySchema = z.enum([
  'housing',
  'utilities',
  'transportation',
  'groceries',
  'healthcare',
  'insurance',
  'debt_payment',
  'savings',
  'entertainment',
  'dining',
  'personal',
  'subscriptions',
  'other',
]);

// --- Record Schemas (one per Dexie table) ---

export const PlanSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  grossIncomeCents: CentsSchema.nonnegative(),
  incomeFrequency: FrequencySchema,
  taxMode: z.enum(['simple', 'itemized']),
  taxEffectiveRate: z.number().min(0).max(100).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  version: z.number().int().nonnegative(),
});

export const BucketAllocationSchema = z
  .object({
    id: z.string().uuid(),
    planId: z.string().uuid(),
    name: z.string().min(1).max(50),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    mode: z.enum(['percentage', 'fixed']),
    targetPercentage: z.number().min(0).max(100).optional(),
    targetAmountCents: CentsSchema.nonnegative().optional(),
    sortOrder: z.number().int().nonnegative(),
    createdAt: z.string().datetime(),
  })
  .refine(
    (b) =>
      b.mode === 'percentage'
        ? b.targetPercentage !== undefined
        : b.targetAmountCents !== undefined,
    {
      message:
        'Must provide targetPercentage or targetAmountCents based on mode',
    },
  );

export const TaxComponentSchema = z.object({
  id: z.string().uuid(),
  planId: z.string().uuid(),
  name: z.string().min(1).max(50),
  ratePercent: z.number().min(0).max(100),
  sortOrder: z.number().int().nonnegative(),
});

export const ExpenseItemSchema = z.object({
  id: z.string().uuid(),
  planId: z.string().uuid(),
  bucketId: z.string().uuid().or(z.literal('')),
  name: z.string().min(1).max(100),
  amountCents: CentsSchema.nonnegative(),
  frequency: FrequencySchema,
  category: ExpenseCategorySchema,
  isFixed: z.boolean(),
  notes: z.string().max(500).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// --- Form Input Schemas ---

export const IncomeInputSchema = z.object({
  grossIncomeDollars: z.number().positive(),
  incomeFrequency: FrequencySchema,
});

export const TaxSimpleInputSchema = z.object({
  effectiveRate: z.number().min(0).max(100),
});

export const TaxComponentInputSchema = z.object({
  name: z.string().min(1).max(50),
  ratePercent: z.number().min(0).max(100),
});

export const BucketInputSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  mode: z.enum(['percentage', 'fixed']),
  targetPercentage: z.number().min(0).max(100).optional(),
  targetAmountDollars: z.number().nonnegative().optional(),
});

export const CreateExpenseInputSchema = z.object({
  name: z.string().min(1).max(100),
  amountDollars: z.number().positive(),
  frequency: FrequencySchema,
  category: ExpenseCategorySchema,
  bucketId: z.string().uuid(),
  isFixed: z.boolean().default(false),
  notes: z.string().max(500).optional(),
});

// --- Export Schema (for import validation) ---

export const ExportSchema = z.object({
  version: z.number().int().positive(),
  exportedAt: z.string().datetime(),
  plan: PlanSchema,
  buckets: z.array(BucketAllocationSchema),
  taxComponents: z.array(TaxComponentSchema),
  expenses: z.array(ExpenseItemSchema),
  snapshots: z.array(
    z.object({
      id: z.string().uuid(),
      planId: z.string().uuid(),
      yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
      grossIncomeCents: CentsSchema,
      netIncomeCents: CentsSchema,
      totalExpensesCents: CentsSchema,
      bucketSummaries: z.array(
        z.object({
          bucketId: z.string(),
          bucketName: z.string(),
          allocatedCents: CentsSchema,
          spentCents: CentsSchema,
          remainingCents: CentsSchema,
        }),
      ),
      createdAt: z.string().datetime(),
    }),
  ),
});
