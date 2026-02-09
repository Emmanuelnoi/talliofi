import { useMemo } from 'react';
import type {
  Plan,
  TaxComponent,
  ExpenseItem,
  BucketAllocation,
} from '@/domain/plan';
import { normalizeToMonthly, computeTax } from '@/domain/plan';
import { subtractMoney } from '@/domain/money';
import type { Cents } from '@/domain/money';
import type {
  DateRange,
  SpendingByCategoryReport,
  IncomeVsExpensesReport,
  BudgetAdherenceReport,
  CategoryTrendsReport,
  TopExpensesReport,
} from '../types';
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
  dateRange,
}: UseReportDataParams): UseReportDataResult {
  const isReady = plan !== null;

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
    if (!plan || expenses.length === 0) return null;
    return calculateSpendingByCategory(expenses, dateRange);
  }, [plan, expenses, dateRange]);

  // Income vs Expenses
  const incomeVsExpenses = useMemo(() => {
    if (!plan) return null;
    return calculateIncomeVsExpenses(plan, taxComponents, expenses, dateRange);
  }, [plan, taxComponents, expenses, dateRange]);

  // Budget Adherence
  const budgetAdherence = useMemo(() => {
    if (!plan || buckets.length === 0) return null;
    return calculateBudgetAdherence(
      buckets,
      expenses,
      netMonthlyIncome,
      dateRange,
    );
  }, [plan, buckets, expenses, netMonthlyIncome, dateRange]);

  // Category Trends
  const categoryTrends = useMemo(() => {
    if (!plan || expenses.length === 0) return null;
    return calculateCategoryTrends(expenses, dateRange);
  }, [plan, expenses, dateRange]);

  // Top Expenses
  const topExpenses = useMemo(() => {
    if (!plan || expenses.length === 0) return null;
    return calculateTopExpenses(expenses, buckets, dateRange, 10);
  }, [plan, expenses, buckets, dateRange]);

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
