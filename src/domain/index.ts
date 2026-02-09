/**
 * Domain layer barrel export.
 *
 * Re-exports all public APIs from the money and plan modules
 * for cleaner imports: `import { cents, Plan } from '@/domain'`
 */

// --- Money module ---
export {
  type Cents,
  cents,
  dollarsToCents,
  centsToDollars,
  formatMoney,
  addMoney,
  subtractMoney,
  multiplyMoney,
  divideMoney,
  percentOf,
  sumMoney,
} from './money';

// --- Plan module: Types ---
export type {
  ExpenseCategory,
  Plan,
  BucketAllocation,
  TaxComponent,
  ExpenseItem,
  MonthlySnapshot,
  BucketSummary,
  BudgetAlert,
  PlanSummary,
  BucketAnalysis,
  RollingAverages,
  ChangeLogEntry,
} from './plan';

// --- Plan module: Frequency normalization ---
export {
  type Frequency,
  normalizeToMonthly,
  denormalizeFromMonthly,
} from './plan';

// --- Plan module: Schemas ---
export {
  CentsSchema,
  FrequencySchema,
  ExpenseCategorySchema,
  PlanSchema,
  BucketAllocationSchema,
  TaxComponentSchema,
  ExpenseItemSchema,
  IncomeInputSchema,
  TaxSimpleInputSchema,
  TaxComponentInputSchema,
  BucketInputSchema,
  CreateExpenseInputSchema,
  ExpenseFormSchema,
  ExpenseEntrySchema,
  ExpensesFormSchema,
  BucketsFormSchema,
  ExportSchema,
} from './plan';

// --- Plan module: Calculation engine ---
export { type PlanComputeInput, computePlanSummary, computeTax } from './plan';

// --- Plan module: Alert rules ---
export { type AlertContext, generateAlerts } from './plan';

// --- Plan module: Snapshots ---
export {
  createMonthlySnapshot,
  computeRollingAverages,
  calculateTrend,
} from './plan';
