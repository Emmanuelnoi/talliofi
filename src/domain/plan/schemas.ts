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

export const GoalTypeSchema = z.enum(['savings', 'debt_payoff']);

export const AssetCategorySchema = z.enum([
  'cash',
  'investment',
  'property',
  'vehicle',
  'other_asset',
]);

export const LiabilityCategorySchema = z.enum([
  'credit_card',
  'mortgage',
  'auto_loan',
  'student_loan',
  'personal_loan',
  'other_liability',
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

/** ISO date string schema for transaction dates (YYYY-MM-DD) */
export const TransactionDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (expected YYYY-MM-DD)')
  .optional();

/** Schema for a single expense split allocation */
export const ExpenseSplitSchema = z.object({
  bucketId: z.string().uuid().or(z.literal('')),
  category: ExpenseCategorySchema,
  amountCents: CentsSchema.nonnegative(),
  notes: z.string().max(500).optional(),
});

export const ExpenseItemSchema = z
  .object({
    id: z.string().uuid(),
    planId: z.string().uuid(),
    bucketId: z.string().uuid().or(z.literal('')),
    name: z.string().min(1).max(100),
    amountCents: CentsSchema.nonnegative(),
    frequency: FrequencySchema,
    category: ExpenseCategorySchema,
    isFixed: z.boolean(),
    notes: z.string().max(500).optional(),
    transactionDate: TransactionDateSchema,
    isSplit: z.boolean().optional(),
    splits: z.array(ExpenseSplitSchema).optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .refine(
    (expense) => {
      // If not split, splits should be undefined or empty
      if (!expense.isSplit) {
        return true;
      }
      // If split, must have at least 2 splits
      if (!expense.splits || expense.splits.length < 2) {
        return false;
      }
      // Splits must sum to total amount
      const splitsTotal = expense.splits.reduce(
        (sum, s) => sum + s.amountCents,
        0,
      );
      return splitsTotal === expense.amountCents;
    },
    {
      message:
        'Split expenses must have at least 2 splits that sum to the total amount',
    },
  );

export const GoalSchema = z.object({
  id: z.string().uuid(),
  planId: z.string().uuid(),
  name: z.string().min(1).max(100),
  type: GoalTypeSchema,
  targetAmountCents: CentsSchema.positive(),
  currentAmountCents: CentsSchema.nonnegative(),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  notes: z.string().max(500).optional(),
  isCompleted: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const AssetSchema = z.object({
  id: z.string().uuid(),
  planId: z.string().uuid(),
  name: z.string().min(1).max(100),
  category: AssetCategorySchema,
  valueCents: CentsSchema.nonnegative(),
  notes: z.string().max(500).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const LiabilitySchema = z.object({
  id: z.string().uuid(),
  planId: z.string().uuid(),
  name: z.string().min(1).max(100),
  category: LiabilityCategorySchema,
  balanceCents: CentsSchema.nonnegative(),
  interestRate: z.number().min(0).max(100).optional(),
  minimumPaymentCents: CentsSchema.nonnegative().optional(),
  notes: z.string().max(500).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const NetWorthSnapshotSchema = z.object({
  id: z.string().uuid(),
  planId: z.string().uuid(),
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
  totalAssetsCents: CentsSchema,
  totalLiabilitiesCents: CentsSchema,
  netWorthCents: CentsSchema,
  assetBreakdown: z.array(
    z.object({
      category: AssetCategorySchema,
      totalCents: CentsSchema,
      count: z.number().int().nonnegative(),
    }),
  ),
  liabilityBreakdown: z.array(
    z.object({
      category: LiabilityCategorySchema,
      totalCents: CentsSchema,
      count: z.number().int().nonnegative(),
    }),
  ),
  createdAt: z.string().datetime(),
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
  transactionDate: TransactionDateSchema,
});

// --- Page Form Schemas (used in feature pages) ---

/** Schema for a single expense split in forms (uses dollars) */
export const ExpenseSplitFormSchema = z.object({
  bucketId: z.string().uuid('Please select a bucket'),
  category: ExpenseCategorySchema,
  amountDollars: z.number().nonnegative('Amount must be non-negative'),
  notes: z.string().max(500).optional(),
});

/**
 * Expense form schema for the expenses page.
 * Uses required isFixed (not defaulted) to avoid react-hook-form type mismatch.
 */
export const ExpenseFormSchema = z
  .object({
    name: z.string().min(1).max(100),
    amountDollars: z.number().positive(),
    frequency: FrequencySchema,
    category: ExpenseCategorySchema,
    bucketId: z.string().uuid(),
    isFixed: z.boolean(),
    notes: z.string().max(500).optional(),
    transactionDate: TransactionDateSchema,
    isSplit: z.boolean().optional(),
    splits: z.array(ExpenseSplitFormSchema).optional(),
  })
  .refine(
    (data) => {
      // If not split, no validation needed for splits
      if (!data.isSplit) {
        return true;
      }
      // If split, must have at least 2 splits
      if (!data.splits || data.splits.length < 2) {
        return false;
      }
      // Splits must sum to total amount
      const splitsTotal = data.splits.reduce((sum, s) => sum + s.amountDollars, 0);
      // Use a small tolerance for floating point comparison
      return Math.abs(splitsTotal - data.amountDollars) < 0.01;
    },
    {
      message: 'Split amounts must sum to the total expense amount',
      path: ['splits'],
    },
  );

/**
 * Expense entry schema for onboarding.
 * Allows empty bucketId since buckets may not exist yet.
 */
export const ExpenseEntrySchema = z.object({
  name: z.string().min(1).max(100),
  amountDollars: z.number().positive(),
  frequency: FrequencySchema,
  category: ExpenseCategorySchema,
  bucketId: z.string(),
  isFixed: z.boolean(),
  notes: z.string().max(500).optional(),
});

/** Wrapper schema for expense list form in onboarding */
export const ExpensesFormSchema = z.object({
  expenses: z.array(ExpenseEntrySchema),
});

/** Wrapper schema for bucket list form in onboarding */
export const BucketsFormSchema = z.object({
  buckets: z.array(BucketInputSchema).min(1, 'Add at least one bucket'),
});

/**
 * Goal form schema for the goals page.
 * Uses dollars for user input, converted to cents on save.
 */
export const GoalFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: GoalTypeSchema,
  targetAmountDollars: z
    .number()
    .positive('Target amount must be greater than 0'),
  currentAmountDollars: z
    .number()
    .nonnegative('Current amount cannot be negative'),
  targetDate: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  notes: z.string().max(500).optional(),
});

/**
 * Asset form schema for the net worth page.
 * Uses dollars for user input, converted to cents on save.
 */
export const AssetFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  category: AssetCategorySchema,
  valueDollars: z.number().nonnegative('Value cannot be negative'),
  notes: z.string().max(500).optional(),
});

/**
 * Liability form schema for the net worth page.
 * Uses dollars for user input, converted to cents on save.
 */
export const LiabilityFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  category: LiabilityCategorySchema,
  balanceDollars: z.number().nonnegative('Balance cannot be negative'),
  interestRate: z.number().min(0).max(100).optional(),
  minimumPaymentDollars: z.number().nonnegative().optional(),
  notes: z.string().max(500).optional(),
});

// --- Recurring Template Schemas ---

export const RecurringTemplateSchema = z.object({
  id: z.string().uuid(),
  planId: z.string().uuid(),
  name: z.string().min(1).max(100),
  amountCents: CentsSchema.nonnegative(),
  frequency: FrequencySchema,
  category: ExpenseCategorySchema,
  bucketId: z.string().uuid().or(z.literal('')),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  isActive: z.boolean(),
  lastGeneratedDate: TransactionDateSchema,
  notes: z.string().max(500).optional(),
  isFixed: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Recurring template form schema for creating/editing templates.
 * Uses dollars for user input, converted to cents on save.
 */
export const RecurringTemplateFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  amountDollars: z.number().positive('Amount must be greater than 0'),
  frequency: FrequencySchema,
  category: ExpenseCategorySchema,
  bucketId: z.string().uuid('Please select a bucket'),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  isActive: z.boolean(),
  notes: z.string().max(500).optional(),
  isFixed: z.boolean(),
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
