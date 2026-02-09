import type { Cents } from '@/domain/money';
import type {
  ExpenseCategory,
  ExpenseItem,
  BucketAllocation,
} from '@/domain/plan';

/**
 * Date range preset identifiers for quick selection.
 */
export type DateRangePreset =
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'year_to_date'
  | 'last_year'
  | 'custom';

/**
 * Represents a date range with start and end dates.
 */
export interface DateRange {
  readonly start: Date;
  readonly end: Date;
}

/**
 * Report type identifiers.
 */
export type ReportType =
  | 'spending_by_category'
  | 'income_vs_expenses'
  | 'budget_adherence'
  | 'category_trends'
  | 'top_expenses';

// --- Report Data Structures ---

/**
 * Data for the Spending by Category report.
 */
export interface SpendingByCategoryData {
  readonly category: ExpenseCategory;
  readonly label: string;
  readonly totalCents: Cents;
  readonly percentage: number;
  readonly expenseCount: number;
}

/**
 * Data for a single month in the Income vs Expenses report.
 */
export interface IncomeVsExpensesMonthData {
  readonly yearMonth: string;
  readonly label: string;
  readonly incomeCents: Cents;
  readonly expensesCents: Cents;
  readonly surplusCents: Cents;
}

/**
 * Data for the Budget Adherence report.
 */
export interface BudgetAdherenceData {
  readonly bucketId: string;
  readonly bucketName: string;
  readonly bucketColor: string;
  readonly targetCents: Cents;
  readonly actualCents: Cents;
  readonly varianceCents: Cents;
  readonly adherencePercent: number;
  readonly status: 'under' | 'on_target' | 'over';
}

/**
 * Data point for a single category in the Category Trends report.
 */
export interface CategoryTrendPoint {
  readonly yearMonth: string;
  readonly label: string;
  readonly amountCents: Cents;
}

/**
 * Data for a single category's trend line.
 */
export interface CategoryTrendData {
  readonly category: ExpenseCategory;
  readonly label: string;
  readonly color: string;
  readonly dataPoints: readonly CategoryTrendPoint[];
}

/**
 * Data for the Top Expenses report.
 */
export interface TopExpenseData {
  readonly expense: ExpenseItem;
  readonly bucket: BucketAllocation | undefined;
  readonly monthlyAmountCents: Cents;
}

// --- Report Results ---

export interface SpendingByCategoryReport {
  readonly type: 'spending_by_category';
  readonly dateRange: DateRange;
  readonly totalCents: Cents;
  readonly data: readonly SpendingByCategoryData[];
}

export interface IncomeVsExpensesReport {
  readonly type: 'income_vs_expenses';
  readonly dateRange: DateRange;
  readonly data: readonly IncomeVsExpensesMonthData[];
  readonly totalIncomeCents: Cents;
  readonly totalExpensesCents: Cents;
  readonly totalSurplusCents: Cents;
}

export interface BudgetAdherenceReport {
  readonly type: 'budget_adherence';
  readonly dateRange: DateRange;
  readonly data: readonly BudgetAdherenceData[];
  readonly overallAdherencePercent: number;
}

export interface CategoryTrendsReport {
  readonly type: 'category_trends';
  readonly dateRange: DateRange;
  readonly trends: readonly CategoryTrendData[];
  readonly months: readonly string[];
}

export interface TopExpensesReport {
  readonly type: 'top_expenses';
  readonly dateRange: DateRange;
  readonly data: readonly TopExpenseData[];
  readonly totalCents: Cents;
}

export type ReportResult =
  | SpendingByCategoryReport
  | IncomeVsExpensesReport
  | BudgetAdherenceReport
  | CategoryTrendsReport
  | TopExpensesReport;
