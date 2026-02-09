import type { Cents } from '@/domain/money';
import type { Frequency } from './normalize';

// --- Expense Categories ---

export type ExpenseCategory =
  | 'housing'
  | 'utilities'
  | 'transportation'
  | 'groceries'
  | 'healthcare'
  | 'insurance'
  | 'debt_payment'
  | 'savings'
  | 'entertainment'
  | 'dining'
  | 'personal'
  | 'subscriptions'
  | 'other';

// --- Goal Types ---

export type GoalType = 'savings' | 'debt_payoff';

// --- Asset and Liability Categories ---

export type AssetCategory =
  | 'cash'
  | 'investment'
  | 'property'
  | 'vehicle'
  | 'other_asset';

export type LiabilityCategory =
  | 'credit_card'
  | 'mortgage'
  | 'auto_loan'
  | 'student_loan'
  | 'personal_loan'
  | 'other_liability';

// --- Plan (lightweight root record) ---

export interface Plan {
  readonly id: string;
  readonly name: string;
  readonly grossIncomeCents: Cents;
  readonly incomeFrequency: Frequency;
  readonly taxMode: 'simple' | 'itemized';
  readonly taxEffectiveRate?: number; // 0-100, used when taxMode === 'simple'
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
}

// --- Bucket Allocation (separate table) ---

export interface BucketAllocation {
  readonly id: string;
  readonly planId: string;
  readonly name: string;
  readonly color: string;
  readonly mode: 'percentage' | 'fixed';
  readonly targetPercentage?: number; // 0-100, used when mode === 'percentage'
  readonly targetAmountCents?: Cents; // used when mode === 'fixed'
  readonly sortOrder: number;
  readonly createdAt: string;
}

// --- Tax Component (separate table, for itemized mode) ---

export interface TaxComponent {
  readonly id: string;
  readonly planId: string;
  readonly name: string; // "Federal", "State", "FICA", etc.
  readonly ratePercent: number;
  readonly sortOrder: number;
}

// --- Expense Split (for split transactions) ---

/**
 * Represents a portion of a split expense allocated to a specific bucket/category.
 * Used when a single transaction needs to be divided across multiple budgets.
 */
export interface ExpenseSplit {
  readonly bucketId: string;
  readonly category: ExpenseCategory;
  readonly amountCents: Cents;
  readonly notes?: string;
}

// --- Expense Item (separate table) ---

export interface ExpenseItem {
  readonly id: string;
  readonly planId: string;
  /**
   * For non-split expenses: the bucket this expense belongs to.
   * For split expenses: the primary bucket (first split or largest amount).
   */
  readonly bucketId: string; // references BucketAllocation.id
  readonly name: string;
  readonly amountCents: Cents;
  readonly frequency: Frequency;
  /**
   * For non-split expenses: the category of this expense.
   * For split expenses: the primary category (first split or largest amount).
   */
  readonly category: ExpenseCategory;
  readonly isFixed: boolean;
  readonly notes?: string;
  /** ISO date string (YYYY-MM-DD) for when the transaction occurred. Optional for backwards compatibility. */
  readonly transactionDate?: string;
  /** Whether this expense is split across multiple buckets/categories */
  readonly isSplit?: boolean;
  /** Split allocations. Only present when isSplit is true. Must sum to amountCents. */
  readonly splits?: readonly ExpenseSplit[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

// --- Goal (separate table) ---

export interface Goal {
  readonly id: string;
  readonly planId: string;
  readonly name: string;
  readonly type: GoalType;
  readonly targetAmountCents: Cents;
  readonly currentAmountCents: Cents;
  readonly targetDate?: string; // ISO date string (YYYY-MM-DD)
  readonly color: string;
  readonly notes?: string;
  readonly isCompleted: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// --- Asset (for net worth tracking) ---

export interface Asset {
  readonly id: string;
  readonly planId: string;
  readonly name: string;
  readonly category: AssetCategory;
  readonly valueCents: Cents;
  readonly notes?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// --- Liability (for net worth tracking) ---

export interface Liability {
  readonly id: string;
  readonly planId: string;
  readonly name: string;
  readonly category: LiabilityCategory;
  readonly balanceCents: Cents;
  readonly interestRate?: number; // percentage (0-100)
  readonly minimumPaymentCents?: Cents;
  readonly notes?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// --- Monthly Snapshot ---

export interface MonthlySnapshot {
  readonly id: string;
  readonly planId: string;
  readonly yearMonth: string; // "2026-01"
  readonly grossIncomeCents: Cents;
  readonly netIncomeCents: Cents;
  readonly totalExpensesCents: Cents;
  readonly bucketSummaries: readonly BucketSummary[];
  readonly createdAt: string;
}

export interface BucketSummary {
  readonly bucketId: string;
  readonly bucketName: string;
  readonly allocatedCents: Cents;
  readonly spentCents: Cents;
  readonly remainingCents: Cents;
}

// --- Computed Summaries (never stored) ---

export interface BudgetAlert {
  readonly severity: 'info' | 'warning' | 'error';
  readonly code: string;
  readonly message: string;
  readonly relatedEntityId?: string;
}

export interface PlanSummary {
  readonly planId: string;
  readonly yearMonth: string;
  readonly grossMonthlyIncome: Cents;
  readonly estimatedTax: Cents;
  readonly netMonthlyIncome: Cents;
  readonly totalMonthlyExpenses: Cents;
  readonly expensesByCategory: ReadonlyMap<ExpenseCategory, Cents>;
  readonly expensesByBucket: ReadonlyMap<string, Cents>;
  readonly bucketAnalysis: readonly BucketAnalysis[];
  readonly surplusOrDeficit: Cents;
  readonly savingsRate: number;
  readonly alerts: readonly BudgetAlert[];
}

export interface BucketAnalysis {
  readonly bucketId: string;
  readonly bucketName: string;
  readonly targetPercentage: number;
  readonly actualPercentage: number;
  readonly targetAmountCents: Cents;
  readonly actualAmountCents: Cents;
  readonly varianceCents: Cents;
  readonly status: 'under' | 'on_target' | 'over';
}

export interface RollingAverages {
  readonly monthsIncluded: number;
  readonly avgTotalExpenses: Cents;
  readonly trend: 'increasing' | 'decreasing' | 'stable';
}

// --- Net Worth Snapshot (monthly record) ---

export interface NetWorthSnapshot {
  readonly id: string;
  readonly planId: string;
  readonly yearMonth: string; // "2026-01"
  readonly totalAssetsCents: Cents;
  readonly totalLiabilitiesCents: Cents;
  readonly netWorthCents: Cents;
  readonly assetBreakdown: readonly AssetSummary[];
  readonly liabilityBreakdown: readonly LiabilitySummary[];
  readonly createdAt: string;
}

export interface AssetSummary {
  readonly category: AssetCategory;
  readonly totalCents: Cents;
  readonly count: number;
}

export interface LiabilitySummary {
  readonly category: LiabilityCategory;
  readonly totalCents: Cents;
  readonly count: number;
}

// --- Recurring Template (for auto-generating expenses) ---

export interface RecurringTemplate {
  readonly id: string;
  readonly planId: string;
  readonly name: string;
  readonly amountCents: Cents;
  readonly frequency: Frequency;
  readonly category: ExpenseCategory;
  readonly bucketId: string;
  /** Day of month (1-31) when expenses should be generated */
  readonly dayOfMonth?: number;
  /** Whether this template is active and should generate expenses */
  readonly isActive: boolean;
  /** ISO date string (YYYY-MM-DD) of the last generated expense */
  readonly lastGeneratedDate?: string;
  readonly notes?: string;
  /** Whether expenses generated from this template are fixed */
  readonly isFixed: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Suggested template from expense pattern detection */
export interface TemplateSuggestion {
  readonly name: string;
  readonly amountCents: Cents;
  readonly frequency: Frequency;
  readonly category: ExpenseCategory;
  readonly confidence: number;
  readonly matchingExpenseIds: readonly string[];
}

// --- Change Log (for future sync) ---

export interface ChangeLogEntry {
  readonly id: string;
  readonly planId: string;
  readonly entityType:
    | 'plan'
    | 'expense'
    | 'bucket'
    | 'tax_component'
    | 'snapshot'
    | 'goal'
    | 'asset'
    | 'liability'
    | 'net_worth_snapshot'
    | 'recurring_template';
  readonly entityId: string;
  readonly operation: 'create' | 'update' | 'delete';
  readonly timestamp: string;
  readonly payload?: string;
}
