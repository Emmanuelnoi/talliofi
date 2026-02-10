import { describe, it, expect } from 'vitest';
import type {
  ExpenseItem,
  BucketAllocation,
  Plan,
  TaxComponent,
} from '@/domain/plan';
import { cents, type Cents } from '@/domain/money';
import {
  getDateRangeFromPreset,
  filterExpensesByDateRange,
  calculateSpendingByCategory,
  calculateIncomeVsExpenses,
  calculateBudgetAdherence,
  calculateCategoryTrends,
  calculateTopExpenses,
  formatDateRange,
  getPresetLabel,
} from '../utils/report-calculations';
import type { DateRange } from '../types';

describe('report-calculations', () => {
  const mockPlan: Plan = {
    id: 'plan-1',
    name: 'Test Plan',
    grossIncomeCents: cents(600000) as Cents, // $6,000
    incomeFrequency: 'monthly',
    taxMode: 'simple',
    taxEffectiveRate: 25,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    version: 1,
  };

  const mockTaxComponents: TaxComponent[] = [];

  const mockBuckets: BucketAllocation[] = [
    {
      id: 'bucket-1',
      planId: 'plan-1',
      name: 'Essentials',
      color: '#4A90D9',
      mode: 'percentage',
      targetPercentage: 50,
      sortOrder: 0,
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'bucket-2',
      planId: 'plan-1',
      name: 'Savings',
      color: '#50C878',
      mode: 'percentage',
      targetPercentage: 20,
      sortOrder: 1,
      createdAt: '2026-01-01T00:00:00Z',
    },
  ];

  const mockExpenses: ExpenseItem[] = [
    {
      id: 'expense-1',
      planId: 'plan-1',
      bucketId: 'bucket-1',
      name: 'Rent',
      amountCents: cents(150000) as Cents, // $1,500
      frequency: 'monthly',
      category: 'housing',
      isFixed: true,
      transactionDate: '2026-01-15',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'expense-2',
      planId: 'plan-1',
      bucketId: 'bucket-1',
      name: 'Groceries',
      amountCents: cents(50000) as Cents, // $500
      frequency: 'monthly',
      category: 'groceries',
      isFixed: false,
      transactionDate: '2026-01-20',
      createdAt: '2026-01-05T00:00:00Z',
      updatedAt: '2026-01-05T00:00:00Z',
    },
    {
      id: 'expense-3',
      planId: 'plan-1',
      bucketId: 'bucket-2',
      name: '401k',
      amountCents: cents(60000) as Cents, // $600
      frequency: 'monthly',
      category: 'savings',
      isFixed: true,
      transactionDate: '2026-02-01',
      createdAt: '2026-02-01T00:00:00Z',
      updatedAt: '2026-02-01T00:00:00Z',
    },
  ];

  describe('getDateRangeFromPreset', () => {
    it('returns correct range for this_month', () => {
      const range = getDateRangeFromPreset('this_month');
      const now = new Date();
      expect(range.start.getMonth()).toBe(now.getMonth());
      expect(range.start.getDate()).toBe(1);
      expect(range.end.getMonth()).toBe(now.getMonth());
    });

    it('returns correct range for last_month', () => {
      const range = getDateRangeFromPreset('last_month');
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      expect(range.start.getMonth()).toBe(lastMonth.getMonth());
      expect(range.start.getDate()).toBe(1);
    });

    it('returns correct range for last_3_months', () => {
      const range = getDateRangeFromPreset('last_3_months');
      const now = new Date();
      expect(range.end.getMonth()).toBe(now.getMonth());
    });

    it('returns correct range for year_to_date', () => {
      const range = getDateRangeFromPreset('year_to_date');
      const now = new Date();
      expect(range.start.getMonth()).toBe(0); // January
      expect(range.start.getDate()).toBe(1);
      expect(range.end.getFullYear()).toBe(now.getFullYear());
    });
  });

  describe('getPresetLabel', () => {
    it('returns correct labels for each preset', () => {
      expect(getPresetLabel('this_month')).toBe('This month');
      expect(getPresetLabel('last_month')).toBe('Last month');
      expect(getPresetLabel('last_3_months')).toBe('Last 3 months');
      expect(getPresetLabel('last_6_months')).toBe('Last 6 months');
      expect(getPresetLabel('year_to_date')).toBe('Year to date');
      expect(getPresetLabel('last_year')).toBe('Last year');
      expect(getPresetLabel('custom')).toBe('Custom range');
    });
  });

  describe('filterExpensesByDateRange', () => {
    const dateRange: DateRange = {
      start: new Date('2026-01-01'),
      end: new Date('2026-01-31'),
    };

    it('filters expenses within the date range', () => {
      const filtered = filterExpensesByDateRange(mockExpenses, dateRange);
      expect(filtered).toHaveLength(2);
      expect(filtered.map((e) => e.id)).toContain('expense-1');
      expect(filtered.map((e) => e.id)).toContain('expense-2');
      expect(filtered.map((e) => e.id)).not.toContain('expense-3');
    });

    it('returns empty array when no expenses match', () => {
      const emptyRange: DateRange = {
        start: new Date('2025-01-01'),
        end: new Date('2025-12-31'),
      };
      const filtered = filterExpensesByDateRange(mockExpenses, emptyRange);
      expect(filtered).toHaveLength(0);
    });
  });

  describe('calculateSpendingByCategory', () => {
    const dateRange: DateRange = {
      start: new Date('2026-01-01'),
      end: new Date('2026-01-31'),
    };

    it('aggregates spending by category', () => {
      const report = calculateSpendingByCategory(mockExpenses, dateRange);

      expect(report.type).toBe('spending_by_category');
      expect(report.data).toHaveLength(2);

      const housing = report.data.find((d) => d.category === 'housing');
      expect(housing?.totalCents).toBe(150000); // $1,500
      expect(housing?.expenseCount).toBe(1);

      const groceries = report.data.find((d) => d.category === 'groceries');
      expect(groceries?.totalCents).toBe(50000); // $500
    });

    it('calculates correct percentages', () => {
      const report = calculateSpendingByCategory(mockExpenses, dateRange);
      const total = report.totalCents;
      expect(total).toBe(200000); // $2,000

      const housing = report.data.find((d) => d.category === 'housing');
      expect(housing?.percentage).toBe(75); // 1500/2000 = 75%

      const groceries = report.data.find((d) => d.category === 'groceries');
      expect(groceries?.percentage).toBe(25); // 500/2000 = 25%
    });

    it('returns empty data when no expenses in range', () => {
      const emptyRange: DateRange = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };
      const report = calculateSpendingByCategory(mockExpenses, emptyRange);
      expect(report.data).toHaveLength(0);
      expect(report.totalCents).toBe(0);
    });
  });

  describe('calculateIncomeVsExpenses', () => {
    const dateRange: DateRange = {
      start: new Date('2026-01-01'),
      end: new Date('2026-02-28'),
    };

    it('returns monthly comparison data', () => {
      const report = calculateIncomeVsExpenses(
        mockPlan,
        mockTaxComponents,
        mockExpenses,
        dateRange,
      );

      expect(report.type).toBe('income_vs_expenses');
      expect(report.data.length).toBeGreaterThanOrEqual(2);
    });

    it('calculates net income correctly', () => {
      const report = calculateIncomeVsExpenses(
        mockPlan,
        mockTaxComponents,
        mockExpenses,
        dateRange,
      );

      // Gross = $6,000, Tax = 25% = $1,500, Net = $4,500
      const januaryData = report.data.find((d) => d.yearMonth === '2026-01');
      expect(januaryData?.incomeCents).toBe(450000); // $4,500
    });

    it('calculates total surplus/deficit', () => {
      const report = calculateIncomeVsExpenses(
        mockPlan,
        mockTaxComponents,
        mockExpenses,
        dateRange,
      );

      expect(report.totalSurplusCents).toBe(
        report.totalIncomeCents - report.totalExpensesCents,
      );
    });
  });

  describe('calculateBudgetAdherence', () => {
    const dateRange: DateRange = {
      start: new Date('2026-01-01'),
      end: new Date('2026-01-31'),
    };
    const netMonthlyIncome = cents(450000) as Cents; // $4,500

    it('calculates adherence for each bucket', () => {
      const report = calculateBudgetAdherence(
        mockBuckets,
        mockExpenses,
        netMonthlyIncome,
        dateRange,
      );

      expect(report.type).toBe('budget_adherence');
      expect(report.data).toHaveLength(2);

      const essentials = report.data.find((d) => d.bucketId === 'bucket-1');
      expect(essentials?.bucketName).toBe('Essentials');
      // Target: 50% of $4,500 = $2,250, Actual: $2,000
      expect(essentials?.targetCents).toBe(225000);
      expect(essentials?.actualCents).toBe(200000);
    });

    it('determines correct status', () => {
      const report = calculateBudgetAdherence(
        mockBuckets,
        mockExpenses,
        netMonthlyIncome,
        dateRange,
      );

      const essentials = report.data.find((d) => d.bucketId === 'bucket-1');
      // Under target by more than 5%, so status should be 'under'
      expect(essentials?.status).toBe('under');
    });

    it('calculates overall adherence', () => {
      const report = calculateBudgetAdherence(
        mockBuckets,
        mockExpenses,
        netMonthlyIncome,
        dateRange,
      );

      expect(report.overallAdherencePercent).toBeGreaterThan(0);
      expect(report.overallAdherencePercent).toBeLessThanOrEqual(100);
    });

    it('includes rollover amounts when enabled', () => {
      const rolloverBuckets: BucketAllocation[] = [
        { ...mockBuckets[0], rolloverEnabled: true },
        ...mockBuckets.slice(1),
      ];
      const rolloverMap = new Map<string, Cents>([
        ['bucket-1', cents(50000) as Cents],
      ]);

      const report = calculateBudgetAdherence(
        rolloverBuckets,
        mockExpenses,
        netMonthlyIncome,
        dateRange,
        rolloverMap,
      );

      const essentials = report.data.find((d) => d.bucketId === 'bucket-1');
      // Base target: 50% of $4,500 = $2,250. Rollover adds $500.
      expect(essentials?.targetCents).toBe(275000);
    });
  });

  describe('calculateCategoryTrends', () => {
    const dateRange: DateRange = {
      start: new Date('2026-01-01'),
      end: new Date('2026-02-28'),
    };

    it('returns trend data for each category', () => {
      const report = calculateCategoryTrends(mockExpenses, dateRange);

      expect(report.type).toBe('category_trends');
      expect(report.trends.length).toBeGreaterThan(0);
      expect(report.months.length).toBeGreaterThanOrEqual(2);
    });

    it('includes data points for all months', () => {
      const report = calculateCategoryTrends(mockExpenses, dateRange);

      for (const trend of report.trends) {
        expect(trend.dataPoints.length).toBe(report.months.length);
      }
    });

    it('sorts categories by total spending', () => {
      const report = calculateCategoryTrends(mockExpenses, dateRange);

      // Housing should be first (highest spending)
      expect(report.trends[0]?.category).toBe('housing');
    });
  });

  describe('calculateTopExpenses', () => {
    const dateRange: DateRange = {
      start: new Date('2026-01-01'),
      end: new Date('2026-02-28'),
    };

    it('returns top expenses sorted by monthly amount', () => {
      const report = calculateTopExpenses(
        mockExpenses,
        mockBuckets,
        dateRange,
        10,
      );

      expect(report.type).toBe('top_expenses');
      expect(report.data.length).toBeLessThanOrEqual(10);
      // First expense should have highest monthly amount
      expect(report.data[0]?.expense.name).toBe('Rent');
    });

    it('includes bucket information', () => {
      const report = calculateTopExpenses(
        mockExpenses,
        mockBuckets,
        dateRange,
        10,
      );

      const rentExpense = report.data.find((d) => d.expense.name === 'Rent');
      expect(rentExpense?.bucket?.name).toBe('Essentials');
    });

    it('respects the limit parameter', () => {
      const report = calculateTopExpenses(
        mockExpenses,
        mockBuckets,
        dateRange,
        1,
      );
      expect(report.data).toHaveLength(1);
    });

    it('calculates total correctly', () => {
      const report = calculateTopExpenses(
        mockExpenses,
        mockBuckets,
        dateRange,
        10,
      );

      const expectedTotal = report.data.reduce(
        (sum, d) => sum + d.monthlyAmountCents,
        0,
      );
      expect(report.totalCents).toBe(expectedTotal);
    });
  });

  describe('formatDateRange', () => {
    it('formats date range correctly', () => {
      const range: DateRange = {
        start: new Date('2026-01-01'),
        end: new Date('2026-01-31'),
      };
      const formatted = formatDateRange(range);
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('2026');
    });
  });
});
