import {
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  subYears,
  format,
  parseISO,
  isWithinInterval,
  eachMonthOfInterval,
} from 'date-fns';
import type { Cents } from '@/domain/money';
import { cents, addMoney, subtractMoney, percentOf } from '@/domain/money';
import type {
  ExpenseItem,
  BucketAllocation,
  ExpenseCategory,
  Plan,
  TaxComponent,
} from '@/domain/plan';
import { normalizeToMonthly, computeTax } from '@/domain/plan';
import { CATEGORY_LABELS } from '@/lib/constants';
import type {
  DateRange,
  DateRangePreset,
  SpendingByCategoryData,
  IncomeVsExpensesMonthData,
  BudgetAdherenceData,
  CategoryTrendData,
  CategoryTrendPoint,
  TopExpenseData,
  SpendingByCategoryReport,
  IncomeVsExpensesReport,
  BudgetAdherenceReport,
  CategoryTrendsReport,
  TopExpensesReport,
} from '../types';

/** Variance threshold (%) within which a bucket is considered on-target */
const BUCKET_VARIANCE_THRESHOLD = 5;

/** Category colors for trend charts */
const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  housing: '#4A90D9',
  utilities: '#50C878',
  transportation: '#FFB347',
  groceries: '#FF6B6B',
  healthcare: '#9B59B6',
  insurance: '#1ABC9C',
  debt_payment: '#F39C12',
  savings: '#27AE60',
  entertainment: '#E74C3C',
  dining: '#3498DB',
  personal: '#9C27B0',
  subscriptions: '#00BCD4',
  other: '#607D8B',
};

/**
 * Calculates the date range for a given preset.
 */
export function getDateRangeFromPreset(preset: DateRangePreset): DateRange {
  const today = new Date();

  switch (preset) {
    case 'this_month':
      return {
        start: startOfMonth(today),
        end: endOfMonth(today),
      };

    case 'last_month': {
      const lastMonth = subMonths(today, 1);
      return {
        start: startOfMonth(lastMonth),
        end: endOfMonth(lastMonth),
      };
    }

    case 'last_3_months':
      return {
        start: startOfMonth(subMonths(today, 2)),
        end: endOfMonth(today),
      };

    case 'last_6_months':
      return {
        start: startOfMonth(subMonths(today, 5)),
        end: endOfMonth(today),
      };

    case 'year_to_date':
      return {
        start: startOfYear(today),
        end: today,
      };

    case 'last_year': {
      const lastYear = subYears(today, 1);
      return {
        start: startOfYear(lastYear),
        end: new Date(lastYear.getFullYear(), 11, 31),
      };
    }

    case 'custom':
    default:
      // Default to this month for custom (actual dates will be set separately)
      return {
        start: startOfMonth(today),
        end: endOfMonth(today),
      };
  }
}

/**
 * Filters expenses to only include those within the given date range.
 * Uses transactionDate if available, falls back to createdAt.
 */
export function filterExpensesByDateRange(
  expenses: readonly ExpenseItem[],
  dateRange: DateRange,
): ExpenseItem[] {
  return expenses.filter((expense) => {
    const dateStr = expense.transactionDate ?? expense.createdAt.split('T')[0];
    const expenseDate = parseISO(dateStr);
    return isWithinInterval(expenseDate, {
      start: dateRange.start,
      end: dateRange.end,
    });
  });
}

/**
 * Calculates spending breakdown by category for the given expenses.
 */
export function calculateSpendingByCategory(
  expenses: readonly ExpenseItem[],
  dateRange: DateRange,
): SpendingByCategoryReport {
  const filtered = filterExpensesByDateRange(expenses, dateRange);

  // Aggregate by category
  const categoryMap = new Map<
    ExpenseCategory,
    { total: Cents; count: number }
  >();
  let grandTotal = cents(0);

  for (const expense of filtered) {
    const monthlyAmount = normalizeToMonthly(
      expense.amountCents,
      expense.frequency,
    );
    grandTotal = addMoney(grandTotal, monthlyAmount);

    const existing = categoryMap.get(expense.category);
    if (existing) {
      categoryMap.set(expense.category, {
        total: addMoney(existing.total, monthlyAmount),
        count: existing.count + 1,
      });
    } else {
      categoryMap.set(expense.category, {
        total: monthlyAmount,
        count: 1,
      });
    }
  }

  // Convert to array and calculate percentages
  const data: SpendingByCategoryData[] = Array.from(categoryMap.entries())
    .map(([category, { total, count }]) => ({
      category,
      label: CATEGORY_LABELS[category],
      totalCents: total,
      percentage: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
      expenseCount: count,
    }))
    .sort((a, b) => b.totalCents - a.totalCents);

  return {
    type: 'spending_by_category',
    dateRange,
    totalCents: grandTotal,
    data,
  };
}

/**
 * Calculates income vs expenses comparison by month.
 */
export function calculateIncomeVsExpenses(
  plan: Plan,
  taxComponents: readonly TaxComponent[],
  expenses: readonly ExpenseItem[],
  dateRange: DateRange,
): IncomeVsExpensesReport {
  // Get all months in the range
  const months = eachMonthOfInterval({
    start: dateRange.start,
    end: dateRange.end,
  });

  // Calculate monthly net income (same for each month as it's based on plan settings)
  const grossMonthlyIncome = normalizeToMonthly(
    plan.grossIncomeCents,
    plan.incomeFrequency,
  );
  const tax = computeTax(grossMonthlyIncome, plan, taxComponents);
  const netMonthlyIncome = subtractMoney(grossMonthlyIncome, tax);

  // Group expenses by month
  const expensesByMonth = new Map<string, Cents>();
  const filtered = filterExpensesByDateRange(expenses, dateRange);

  for (const expense of filtered) {
    const dateStr = expense.transactionDate ?? expense.createdAt.split('T')[0];
    const yearMonth = dateStr.slice(0, 7); // "YYYY-MM"
    const monthlyAmount = normalizeToMonthly(
      expense.amountCents,
      expense.frequency,
    );
    const existing = expensesByMonth.get(yearMonth) ?? cents(0);
    expensesByMonth.set(yearMonth, addMoney(existing, monthlyAmount));
  }

  // Build month-by-month data
  const data: IncomeVsExpensesMonthData[] = months.map((month) => {
    const yearMonth = format(month, 'yyyy-MM');
    const expensesCents = expensesByMonth.get(yearMonth) ?? cents(0);
    return {
      yearMonth,
      label: format(month, 'MMM yyyy'),
      incomeCents: netMonthlyIncome,
      expensesCents,
      surplusCents: subtractMoney(netMonthlyIncome, expensesCents),
    };
  });

  // Calculate totals
  const totalIncomeCents = data.reduce(
    (sum, d) => addMoney(sum, d.incomeCents),
    cents(0),
  );
  const totalExpensesCents = data.reduce(
    (sum, d) => addMoney(sum, d.expensesCents),
    cents(0),
  );
  const totalSurplusCents = subtractMoney(totalIncomeCents, totalExpensesCents);

  return {
    type: 'income_vs_expenses',
    dateRange,
    data,
    totalIncomeCents,
    totalExpensesCents,
    totalSurplusCents,
  };
}

/**
 * Calculates how well actual spending matches bucket allocations.
 */
export function calculateBudgetAdherence(
  buckets: readonly BucketAllocation[],
  expenses: readonly ExpenseItem[],
  netMonthlyIncome: Cents,
  dateRange: DateRange,
): BudgetAdherenceReport {
  const filtered = filterExpensesByDateRange(expenses, dateRange);

  // Aggregate expenses by bucket
  const expensesByBucket = new Map<string, Cents>();
  for (const expense of filtered) {
    const monthlyAmount = normalizeToMonthly(
      expense.amountCents,
      expense.frequency,
    );
    const existing = expensesByBucket.get(expense.bucketId) ?? cents(0);
    expensesByBucket.set(expense.bucketId, addMoney(existing, monthlyAmount));
  }

  // Calculate adherence for each bucket
  const data: BudgetAdherenceData[] = buckets.map((bucket) => {
    const targetCents =
      bucket.mode === 'percentage'
        ? percentOf(netMonthlyIncome, bucket.targetPercentage ?? 0)
        : (bucket.targetAmountCents ?? cents(0));

    const actualCents = expensesByBucket.get(bucket.id) ?? cents(0);
    const varianceCents = subtractMoney(targetCents, actualCents);

    // Adherence percentage: how close to target (100% = perfect)
    const adherencePercent =
      targetCents > 0
        ? Math.max(
            0,
            Math.min(200, (1 - Math.abs(varianceCents) / targetCents) * 100),
          )
        : actualCents === 0
          ? 100
          : 0;

    // Determine status
    const variancePercent =
      targetCents > 0 ? (varianceCents / targetCents) * 100 : 0;
    const status: 'under' | 'on_target' | 'over' =
      variancePercent > BUCKET_VARIANCE_THRESHOLD
        ? 'under'
        : variancePercent < -BUCKET_VARIANCE_THRESHOLD
          ? 'over'
          : 'on_target';

    return {
      bucketId: bucket.id,
      bucketName: bucket.name,
      bucketColor: bucket.color,
      targetCents,
      actualCents,
      varianceCents,
      adherencePercent,
      status,
    };
  });

  // Calculate overall adherence (weighted by target amounts)
  const totalTarget = data.reduce((sum, d) => sum + d.targetCents, 0);
  const weightedAdherence = data.reduce(
    (sum, d) =>
      sum +
      (totalTarget > 0
        ? (d.adherencePercent * d.targetCents) / totalTarget
        : 0),
    0,
  );

  return {
    type: 'budget_adherence',
    dateRange,
    data,
    overallAdherencePercent: totalTarget > 0 ? weightedAdherence : 100,
  };
}

/**
 * Calculates spending trends by category over time.
 */
export function calculateCategoryTrends(
  expenses: readonly ExpenseItem[],
  dateRange: DateRange,
): CategoryTrendsReport {
  const filtered = filterExpensesByDateRange(expenses, dateRange);

  // Get all months in the range
  const months = eachMonthOfInterval({
    start: dateRange.start,
    end: dateRange.end,
  });
  const monthStrings = months.map((m) => format(m, 'yyyy-MM'));

  // Get unique categories with expenses
  const categoriesWithExpenses = new Set<ExpenseCategory>();
  for (const expense of filtered) {
    categoriesWithExpenses.add(expense.category);
  }

  // Build trend data for each category
  const trends: CategoryTrendData[] = Array.from(categoriesWithExpenses)
    .map((category) => {
      // Group this category's expenses by month
      const byMonth = new Map<string, Cents>();
      for (const expense of filtered) {
        if (expense.category !== category) continue;
        const dateStr =
          expense.transactionDate ?? expense.createdAt.split('T')[0];
        const yearMonth = dateStr.slice(0, 7);
        const monthlyAmount = normalizeToMonthly(
          expense.amountCents,
          expense.frequency,
        );
        const existing = byMonth.get(yearMonth) ?? cents(0);
        byMonth.set(yearMonth, addMoney(existing, monthlyAmount));
      }

      // Build data points for all months (including zeros)
      const dataPoints: CategoryTrendPoint[] = monthStrings.map(
        (yearMonth) => ({
          yearMonth,
          label: format(parseISO(`${yearMonth}-01`), 'MMM'),
          amountCents: byMonth.get(yearMonth) ?? cents(0),
        }),
      );

      return {
        category,
        label: CATEGORY_LABELS[category],
        color: CATEGORY_COLORS[category],
        dataPoints,
      };
    })
    .sort((a, b) => {
      // Sort by total spending descending
      const totalA = a.dataPoints.reduce((sum, p) => sum + p.amountCents, 0);
      const totalB = b.dataPoints.reduce((sum, p) => sum + p.amountCents, 0);
      return totalB - totalA;
    });

  return {
    type: 'category_trends',
    dateRange,
    trends,
    months: monthStrings,
  };
}

/**
 * Gets the top expenses within the date range.
 */
export function calculateTopExpenses(
  expenses: readonly ExpenseItem[],
  buckets: readonly BucketAllocation[],
  dateRange: DateRange,
  limit = 10,
): TopExpensesReport {
  const filtered = filterExpensesByDateRange(expenses, dateRange);

  // Create bucket lookup
  const bucketMap = new Map<string, BucketAllocation>();
  for (const bucket of buckets) {
    bucketMap.set(bucket.id, bucket);
  }

  // Map expenses to report data and sort by monthly amount
  const data: TopExpenseData[] = filtered
    .map((expense) => ({
      expense,
      bucket: bucketMap.get(expense.bucketId),
      monthlyAmountCents: normalizeToMonthly(
        expense.amountCents,
        expense.frequency,
      ),
    }))
    .sort((a, b) => b.monthlyAmountCents - a.monthlyAmountCents)
    .slice(0, limit);

  // Calculate total
  const totalCents = data.reduce(
    (sum, d) => addMoney(sum, d.monthlyAmountCents),
    cents(0),
  );

  return {
    type: 'top_expenses',
    dateRange,
    data,
    totalCents,
  };
}

/**
 * Formats a date range for display.
 */
export function formatDateRange(dateRange: DateRange): string {
  const startStr = format(dateRange.start, 'MMM d, yyyy');
  const endStr = format(dateRange.end, 'MMM d, yyyy');
  return `${startStr} - ${endStr}`;
}

/**
 * Gets the label for a date range preset.
 */
export function getPresetLabel(preset: DateRangePreset): string {
  switch (preset) {
    case 'this_month':
      return 'This month';
    case 'last_month':
      return 'Last month';
    case 'last_3_months':
      return 'Last 3 months';
    case 'last_6_months':
      return 'Last 6 months';
    case 'year_to_date':
      return 'Year to date';
    case 'last_year':
      return 'Last year';
    case 'custom':
      return 'Custom range';
  }
}
