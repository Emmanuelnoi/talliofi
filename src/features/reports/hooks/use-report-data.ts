import { useMemo } from 'react';
import type {
  Plan,
  TaxComponent,
  ExpenseItem,
  BucketAllocation,
  MonthlySnapshot,
} from '@/domain/plan';
import {
  normalizeToMonthly,
  computeTax,
  getRolloverMapFromSnapshots,
} from '@/domain/plan';
import { subtractMoney } from '@/domain/money';
import type { Cents, ExchangeRates } from '@/domain/money';
import type {
  DateRange,
  SpendingByCategoryReport,
  IncomeVsExpensesReport,
  BudgetAdherenceReport,
  CategoryTrendsReport,
  TopExpensesReport,
} from '../types';
import { convertExpensesToBase } from '@/lib/currency-conversion';
import { DEFAULT_CURRENCY } from '@/domain/money';
import {
  calculateSpendingByCategory,
  calculateIncomeVsExpenses,
  calculateBudgetAdherence,
  calculateCategoryTrends,
  calculateTopExpenses,
} from '../utils/report-calculations';

interface UseReportDataParams {
  plan: Plan | null;
  taxComponents: readonly TaxComponent[];
  expenses: readonly ExpenseItem[];
  buckets: readonly BucketAllocation[];
  snapshots: readonly MonthlySnapshot[];
  exchangeRates?: ExchangeRates;
  includeRollover: boolean;
  dateRange: DateRange;
}

interface UseReportDataResult {
  spendingByCategory: SpendingByCategoryReport | null;
  incomeVsExpenses: IncomeVsExpensesReport | null;
  budgetAdherence: BudgetAdherenceReport | null;
  categoryTrends: CategoryTrendsReport | null;
  topExpenses: TopExpensesReport | null;
  netMonthlyIncome: Cents;
  isReady: boolean;
}

/**
 * Hook that computes all report data for the given date range.
 * Memoizes calculations to avoid unnecessary recomputation.
 */
export function useReportData({
  plan,
  taxComponents,
  expenses,
  buckets,
  snapshots,
  exchangeRates,
  includeRollover,
  dateRange,
}: UseReportDataParams): UseReportDataResult {
  const isReady = plan !== null;
  const baseCurrency = plan?.currencyCode ?? DEFAULT_CURRENCY;
  const expensesInBase = useMemo(
    () => convertExpensesToBase(expenses, baseCurrency, exchangeRates),
    [expenses, baseCurrency, exchangeRates],
  );

  // Calculate net monthly income once
  const netMonthlyIncome = useMemo(() => {
    if (!plan) return 0 as Cents;
    const grossMonthlyIncome = normalizeToMonthly(
      plan.grossIncomeCents,
      plan.incomeFrequency,
    );
    const tax = computeTax(grossMonthlyIncome, plan, taxComponents);
    return subtractMoney(grossMonthlyIncome, tax);
  }, [plan, taxComponents]);

  // Spending by Category
  const spendingByCategory = useMemo(() => {
    if (!plan || expensesInBase.length === 0) return null;
    return calculateSpendingByCategory(expensesInBase, dateRange);
  }, [plan, expensesInBase, dateRange]);

  // Income vs Expenses
  const incomeVsExpenses = useMemo(() => {
    if (!plan) return null;
    return calculateIncomeVsExpenses(
      plan,
      taxComponents,
      expensesInBase,
      dateRange,
    );
  }, [plan, taxComponents, expensesInBase, dateRange]);

  // Budget Adherence
  const budgetAdherence = useMemo(() => {
    if (!plan || buckets.length === 0) return null;
    const yearMonth = `${dateRange.start.getFullYear()}-${String(
      dateRange.start.getMonth() + 1,
    ).padStart(2, '0')}`;
    const rolloverByBucket =
      includeRollover && snapshots.length > 0
        ? getRolloverMapFromSnapshots(snapshots, yearMonth)
        : undefined;
    return calculateBudgetAdherence(
      buckets,
      expensesInBase,
      netMonthlyIncome,
      dateRange,
      rolloverByBucket,
    );
  }, [
    plan,
    buckets,
    expensesInBase,
    netMonthlyIncome,
    dateRange,
    snapshots,
    includeRollover,
  ]);

  // Category Trends
  const categoryTrends = useMemo(() => {
    if (!plan || expensesInBase.length === 0) return null;
    return calculateCategoryTrends(expensesInBase, dateRange);
  }, [plan, expensesInBase, dateRange]);

  // Top Expenses
  const topExpenses = useMemo(() => {
    if (!plan || expensesInBase.length === 0) return null;
    return calculateTopExpenses(expensesInBase, buckets, dateRange, 10);
  }, [plan, expensesInBase, buckets, dateRange]);

  return {
    spendingByCategory,
    incomeVsExpenses,
    budgetAdherence,
    categoryTrends,
    topExpenses,
    netMonthlyIncome,
    isReady,
  };
}
