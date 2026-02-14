// Types
export type {
  ExpenseCategory,
  GoalType,
  AssetCategory,
  LiabilityCategory,
  Plan,
  BucketAllocation,
  TaxComponent,
  ExpenseItem,
  ExpenseAttachment,
  ExpenseSplit,
  Goal,
  Asset,
  Liability,
  MonthlySnapshot,
  BucketSummary,
  BudgetAlert,
  PlanSummary,
  BucketAnalysis,
  RollingAverages,
  NetWorthSnapshot,
  AssetSummary,
  LiabilitySummary,
  ChangeLogEntry,
  RecurringTemplate,
  TemplateSuggestion,
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
  CurrencyCodeSchema,
  ExpenseCategorySchema,
  GoalTypeSchema,
  AssetCategorySchema,
  LiabilityCategorySchema,
  PlanSchema,
  BucketAllocationSchema,
  TaxComponentSchema,
  ExpenseSplitSchema,
  ExpenseItemSchema,
  ExpenseAttachmentSchema,
  GoalSchema,
  GoalFormSchema,
  AssetSchema,
  LiabilitySchema,
  NetWorthSnapshotSchema,
  AssetFormSchema,
  LiabilityFormSchema,
  IncomeInputSchema,
  TaxSimpleInputSchema,
  TaxComponentInputSchema,
  BucketInputSchema,
  CreateExpenseInputSchema,
  ExpenseSplitFormSchema,
  ExpenseFormSchema,
  ExpenseEntrySchema,
  ExpensesFormSchema,
  BucketsFormSchema,
  ExportSchema,
  RecurringTemplateSchema,
  RecurringTemplateFormSchema,
  BucketSummarySchema,
  MonthlySnapshotSchema,
  TransactionDateSchema,
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

// Rollover helpers
export {
  getCurrentYearMonth,
  getPreviousYearMonth,
  getRolloverMapFromSnapshots,
} from './rollover';
