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

// --- Expense Item (separate table) ---

export interface ExpenseItem {
  readonly id: string;
  readonly planId: string;
  readonly bucketId: string; // references BucketAllocation.id
  readonly name: string;
  readonly amountCents: Cents;
  readonly frequency: Frequency;
  readonly category: ExpenseCategory;
  readonly isFixed: boolean;
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

// --- Change Log (for future sync) ---

export interface ChangeLogEntry {
  readonly id: string;
  readonly planId: string;
  readonly entityType:
    | 'plan'
    | 'expense'
    | 'bucket'
    | 'tax_component'
    | 'snapshot';
  readonly entityId: string;
  readonly operation: 'create' | 'update' | 'delete';
  readonly timestamp: string;
  readonly payload?: string;
}
