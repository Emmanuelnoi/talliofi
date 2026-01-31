// Types
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
} from './types';

// Frequency normalization
export {
  type Frequency,
  normalizeToMonthly,
  denormalizeFromMonthly,
} from './normalize';

// Schemas
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
  ExportSchema,
} from './schemas';

// Calculation engine
export { type PlanComputeInput, computePlanSummary, computeTax } from './calc';

// Alert rules
export { type AlertContext, generateAlerts } from './rules';

// Snapshots
export {
  createMonthlySnapshot,
  computeRollingAverages,
  calculateTrend,
} from './snapshot';
