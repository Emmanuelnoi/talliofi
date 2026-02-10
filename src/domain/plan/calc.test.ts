import { describe, it, expect } from 'vitest';
import { cents } from '@/domain/money';
import type {
  Plan,
  BucketAllocation,
  ExpenseItem,
  TaxComponent,
} from './types';
import { computeTax, computePlanSummary } from './calc';
import type { PlanComputeInput } from './calc';

// ---------------------------------------------------------------------------
// Test factory helpers
// ---------------------------------------------------------------------------

function makePlan(overrides: Partial<Plan> = {}): Plan {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: 'Test Plan',
    grossIncomeCents: cents(500000), // $5,000 monthly
    incomeFrequency: 'monthly',
    taxMode: 'simple',
    taxEffectiveRate: 20,
    createdAt: now,
    updatedAt: now,
    version: 1,
    ...overrides,
  };
}

function makeBucket(
  overrides: Partial<BucketAllocation> = {},
): BucketAllocation {
  return {
    id: crypto.randomUUID(),
    planId: '',
    name: 'Test Bucket',
    color: '#FF0000',
    mode: 'percentage',
    targetPercentage: 30,
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeExpense(overrides: Partial<ExpenseItem> = {}): ExpenseItem {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    planId: '',
    bucketId: '',
    name: 'Test Expense',
    amountCents: cents(100000), // $1,000
    frequency: 'monthly',
    category: 'housing',
    isFixed: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeTaxComponent(overrides: Partial<TaxComponent> = {}): TaxComponent {
  return {
    id: crypto.randomUUID(),
    planId: '',
    name: 'Federal',
    ratePercent: 22,
    sortOrder: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// computeTax()
// ---------------------------------------------------------------------------

describe('computeTax()', () => {
  it('computes tax in simple mode using effective rate', () => {
    const plan = makePlan({ taxMode: 'simple', taxEffectiveRate: 25 });
    const result = computeTax(cents(500000), plan, []);
    // 500000 * 25 / 100 = 125000
    expect(result).toBe(125000);
  });

  it('computes tax in itemized mode by summing component rates', () => {
    const plan = makePlan({ taxMode: 'itemized' });
    const components = [
      makeTaxComponent({ ratePercent: 22 }),
      makeTaxComponent({ name: 'State', ratePercent: 5 }),
      makeTaxComponent({ name: 'FICA', ratePercent: 7.65 }),
    ];
    // Total rate: 34.65%
    const result = computeTax(cents(500000), plan, components);
    // 500000 * 34.65 / 100 = 173250
    expect(result).toBe(173250);
  });

  it('returns zero tax when effective rate is zero', () => {
    const plan = makePlan({ taxMode: 'simple', taxEffectiveRate: 0 });
    expect(computeTax(cents(500000), plan, [])).toBe(0);
  });

  it('returns zero tax for itemized mode with no components', () => {
    const plan = makePlan({ taxMode: 'itemized' });
    expect(computeTax(cents(500000), plan, [])).toBe(0);
  });

  it('defaults to 0 rate when simple mode has no taxEffectiveRate', () => {
    const plan = makePlan({
      taxMode: 'simple',
      taxEffectiveRate: undefined,
    });
    expect(computeTax(cents(500000), plan, [])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computePlanSummary()
// ---------------------------------------------------------------------------

describe('computePlanSummary()', () => {
  it('computes basic income -> tax -> net -> surplus flow', () => {
    const plan = makePlan({
      grossIncomeCents: cents(500000),
      incomeFrequency: 'monthly',
      taxMode: 'simple',
      taxEffectiveRate: 20,
    });
    const bucketId = crypto.randomUUID();
    const bucket = makeBucket({
      id: bucketId,
      planId: plan.id,
      targetPercentage: 50,
    });
    const expense = makeExpense({
      planId: plan.id,
      bucketId,
      amountCents: cents(100000),
      frequency: 'monthly',
    });

    const input: PlanComputeInput = {
      plan,
      buckets: [bucket],
      expenses: [expense],
      taxComponents: [],
    };

    const summary = computePlanSummary(input, '2026-01');

    // Gross monthly = 500000
    expect(summary.grossMonthlyIncome).toBe(500000);
    // Tax = 500000 * 20% = 100000
    expect(summary.estimatedTax).toBe(100000);
    // Net = 500000 - 100000 = 400000
    expect(summary.netMonthlyIncome).toBe(400000);
    // Total expenses = 100000
    expect(summary.totalMonthlyExpenses).toBe(100000);
    // Surplus = 400000 - 100000 = 300000
    expect(summary.surplusOrDeficit).toBe(300000);
  });

  it('aggregates multiple expenses by category and bucket', () => {
    const plan = makePlan();
    const bucketId = crypto.randomUUID();

    const expense1 = makeExpense({
      planId: plan.id,
      bucketId,
      name: 'Rent',
      amountCents: cents(150000),
      frequency: 'monthly',
      category: 'housing',
    });
    const expense2 = makeExpense({
      planId: plan.id,
      bucketId,
      name: 'Groceries',
      amountCents: cents(50000),
      frequency: 'monthly',
      category: 'groceries',
    });

    const input: PlanComputeInput = {
      plan,
      buckets: [],
      expenses: [expense1, expense2],
      taxComponents: [],
    };

    const summary = computePlanSummary(input, '2026-01');

    expect(summary.totalMonthlyExpenses).toBe(200000);
    expect(summary.expensesByCategory.get('housing')).toBe(150000);
    expect(summary.expensesByCategory.get('groceries')).toBe(50000);
    expect(summary.expensesByBucket.get(bucketId)).toBe(200000);
  });

  it('computes percentage bucket analysis correctly', () => {
    const plan = makePlan({
      grossIncomeCents: cents(500000),
      taxMode: 'simple',
      taxEffectiveRate: 20,
    });
    // Net = 400000
    const bucketId = crypto.randomUUID();
    const bucket = makeBucket({
      id: bucketId,
      planId: plan.id,
      mode: 'percentage',
      targetPercentage: 25,
    });

    const input: PlanComputeInput = {
      plan,
      buckets: [bucket],
      expenses: [],
      taxComponents: [],
    };

    const summary = computePlanSummary(input, '2026-01');
    const analysis = summary.bucketAnalysis[0];

    // 25% of 400000 = 100000
    expect(analysis.targetAmountCents).toBe(100000);
    expect(analysis.targetPercentage).toBe(25);
  });

  it('computes fixed bucket analysis correctly', () => {
    const plan = makePlan({
      grossIncomeCents: cents(500000),
      taxMode: 'simple',
      taxEffectiveRate: 20,
    });
    // Net = 400000
    const bucketId = crypto.randomUUID();
    const bucket = makeBucket({
      id: bucketId,
      planId: plan.id,
      mode: 'fixed',
      targetPercentage: undefined,
      targetAmountCents: cents(80000),
    });

    const input: PlanComputeInput = {
      plan,
      buckets: [bucket],
      expenses: [],
      taxComponents: [],
    };

    const summary = computePlanSummary(input, '2026-01');
    const analysis = summary.bucketAnalysis[0];

    expect(analysis.targetAmountCents).toBe(80000);
    // 80000 / 400000 * 100 = 20%
    expect(analysis.targetPercentage).toBe(20);
  });

  it('detects bucket status: under, on_target, over', () => {
    const plan = makePlan({
      grossIncomeCents: cents(1000000),
      taxMode: 'simple',
      taxEffectiveRate: 0,
    });
    // Net = 1000000

    const underId = crypto.randomUUID();
    const onTargetId = crypto.randomUUID();
    const overId = crypto.randomUUID();

    const underBucket = makeBucket({
      id: underId,
      planId: plan.id,
      targetPercentage: 50, // target = 500000
      sortOrder: 0,
    });
    const onTargetBucket = makeBucket({
      id: onTargetId,
      planId: plan.id,
      targetPercentage: 20, // target = 200000
      sortOrder: 1,
    });
    const overBucket = makeBucket({
      id: overId,
      planId: plan.id,
      targetPercentage: 10, // target = 100000
      sortOrder: 2,
    });

    // Under: spend 200000 vs target 500000 => well under
    const underExpense = makeExpense({
      planId: plan.id,
      bucketId: underId,
      amountCents: cents(200000),
    });
    // On target: spend 200000 vs target 200000
    const onTargetExpense = makeExpense({
      planId: plan.id,
      bucketId: onTargetId,
      amountCents: cents(200000),
    });
    // Over: spend 200000 vs target 100000
    const overExpense = makeExpense({
      planId: plan.id,
      bucketId: overId,
      amountCents: cents(200000),
    });

    const input: PlanComputeInput = {
      plan,
      buckets: [underBucket, onTargetBucket, overBucket],
      expenses: [underExpense, onTargetExpense, overExpense],
      taxComponents: [],
    };

    const summary = computePlanSummary(input, '2026-01');

    const underAnalysis = summary.bucketAnalysis.find(
      (b) => b.bucketId === underId,
    );
    const onTargetAnalysis = summary.bucketAnalysis.find(
      (b) => b.bucketId === onTargetId,
    );
    const overAnalysis = summary.bucketAnalysis.find(
      (b) => b.bucketId === overId,
    );

    expect(underAnalysis?.status).toBe('under');
    expect(onTargetAnalysis?.status).toBe('on_target');
    expect(overAnalysis?.status).toBe('over');
  });

  it('detects deficit when expenses exceed net income', () => {
    const plan = makePlan({
      grossIncomeCents: cents(200000),
      taxMode: 'simple',
      taxEffectiveRate: 20,
    });
    // Net = 160000
    const expense = makeExpense({
      planId: plan.id,
      amountCents: cents(250000),
      frequency: 'monthly',
    });

    const input: PlanComputeInput = {
      plan,
      buckets: [],
      expenses: [expense],
      taxComponents: [],
    };

    const summary = computePlanSummary(input, '2026-01');

    expect(summary.surplusOrDeficit).toBe(-90000);
    expect(summary.surplusOrDeficit).toBeLessThan(0);
  });

  it('handles zero income edge case', () => {
    const plan = makePlan({
      grossIncomeCents: cents(0),
      taxMode: 'simple',
      taxEffectiveRate: 0,
    });

    const input: PlanComputeInput = {
      plan,
      buckets: [],
      expenses: [],
      taxComponents: [],
    };

    const summary = computePlanSummary(input, '2026-01');

    expect(summary.grossMonthlyIncome).toBe(0);
    expect(summary.netMonthlyIncome).toBe(0);
    expect(summary.totalMonthlyExpenses).toBe(0);
    expect(summary.surplusOrDeficit).toBe(0);
    expect(summary.savingsRate).toBe(0);
  });

  it('returns zero expenses and surplus = net income when no expenses', () => {
    const plan = makePlan({
      grossIncomeCents: cents(500000),
      taxMode: 'simple',
      taxEffectiveRate: 20,
    });
    // Net = 400000

    const input: PlanComputeInput = {
      plan,
      buckets: [],
      expenses: [],
      taxComponents: [],
    };

    const summary = computePlanSummary(input, '2026-01');

    expect(summary.totalMonthlyExpenses).toBe(0);
    expect(summary.surplusOrDeficit).toBe(400000);
  });

  it('returns empty bucket analysis when no buckets', () => {
    const plan = makePlan();

    const input: PlanComputeInput = {
      plan,
      buckets: [],
      expenses: [],
      taxComponents: [],
    };

    const summary = computePlanSummary(input, '2026-01');

    expect(summary.bucketAnalysis).toHaveLength(0);
  });

  it('computes savingsRate as a percentage of net income', () => {
    const plan = makePlan({
      grossIncomeCents: cents(500000),
      taxMode: 'simple',
      taxEffectiveRate: 0,
    });
    // Net = 500000
    const expense = makeExpense({
      planId: plan.id,
      amountCents: cents(250000),
    });

    const input: PlanComputeInput = {
      plan,
      buckets: [],
      expenses: [expense],
      taxComponents: [],
    };

    const summary = computePlanSummary(input, '2026-01');

    // Surplus = 250000, savingsRate = (250000 / 500000) * 100 = 50
    expect(summary.savingsRate).toBe(50);
  });

  // Split transaction tests
  describe('split expense aggregation', () => {
    it('aggregates split expenses by individual split categories', () => {
      const plan = makePlan({
        grossIncomeCents: cents(500000),
        taxMode: 'simple',
        taxEffectiveRate: 0,
      });

      const bucket1 = crypto.randomUUID();
      const bucket2 = crypto.randomUUID();

      // A $100 expense split between groceries ($60) and personal ($40)
      const splitExpense = makeExpense({
        planId: plan.id,
        bucketId: bucket1,
        name: 'Costco Run',
        amountCents: cents(10000), // $100
        category: 'groceries',
        isSplit: true,
        splits: [
          {
            bucketId: bucket1,
            category: 'groceries',
            amountCents: cents(6000),
          },
          { bucketId: bucket2, category: 'personal', amountCents: cents(4000) },
        ],
      });

      const input: PlanComputeInput = {
        plan,
        buckets: [],
        expenses: [splitExpense],
        taxComponents: [],
      };

      const summary = computePlanSummary(input, '2026-01');

      // Total should still be $100
      expect(summary.totalMonthlyExpenses).toBe(10000);
      // Categories should be split
      expect(summary.expensesByCategory.get('groceries')).toBe(6000);
      expect(summary.expensesByCategory.get('personal')).toBe(4000);
    });

    it('aggregates split expenses by individual split buckets', () => {
      const plan = makePlan({
        grossIncomeCents: cents(500000),
        taxMode: 'simple',
        taxEffectiveRate: 0,
      });

      const bucket1 = crypto.randomUUID();
      const bucket2 = crypto.randomUUID();

      const splitExpense = makeExpense({
        planId: plan.id,
        bucketId: bucket1,
        name: 'Split Expense',
        amountCents: cents(10000),
        category: 'groceries',
        isSplit: true,
        splits: [
          {
            bucketId: bucket1,
            category: 'groceries',
            amountCents: cents(6000),
          },
          {
            bucketId: bucket2,
            category: 'groceries',
            amountCents: cents(4000),
          },
        ],
      });

      const input: PlanComputeInput = {
        plan,
        buckets: [],
        expenses: [splitExpense],
        taxComponents: [],
      };

      const summary = computePlanSummary(input, '2026-01');

      // Buckets should be split
      expect(summary.expensesByBucket.get(bucket1)).toBe(6000);
      expect(summary.expensesByBucket.get(bucket2)).toBe(4000);
    });

    it('combines split and non-split expenses correctly', () => {
      const plan = makePlan({
        grossIncomeCents: cents(500000),
        taxMode: 'simple',
        taxEffectiveRate: 0,
      });

      const bucket1 = crypto.randomUUID();
      const bucket2 = crypto.randomUUID();

      // Regular expense: $50 groceries
      const regularExpense = makeExpense({
        planId: plan.id,
        bucketId: bucket1,
        name: 'Regular Groceries',
        amountCents: cents(5000),
        category: 'groceries',
        isSplit: false,
      });

      // Split expense: $100 total, $60 groceries + $40 personal
      const splitExpense = makeExpense({
        planId: plan.id,
        bucketId: bucket1,
        name: 'Costco Run',
        amountCents: cents(10000),
        category: 'groceries',
        isSplit: true,
        splits: [
          {
            bucketId: bucket1,
            category: 'groceries',
            amountCents: cents(6000),
          },
          { bucketId: bucket2, category: 'personal', amountCents: cents(4000) },
        ],
      });

      const input: PlanComputeInput = {
        plan,
        buckets: [],
        expenses: [regularExpense, splitExpense],
        taxComponents: [],
      };

      const summary = computePlanSummary(input, '2026-01');

      // Total: $50 + $100 = $150
      expect(summary.totalMonthlyExpenses).toBe(15000);
      // Groceries: $50 (regular) + $60 (split) = $110
      expect(summary.expensesByCategory.get('groceries')).toBe(11000);
      // Personal: $40 (split only)
      expect(summary.expensesByCategory.get('personal')).toBe(4000);
      // Bucket1: $50 (regular) + $60 (split) = $110
      expect(summary.expensesByBucket.get(bucket1)).toBe(11000);
      // Bucket2: $40 (split only)
      expect(summary.expensesByBucket.get(bucket2)).toBe(4000);
    });

    it('handles non-monthly split expenses with correct normalization', () => {
      const plan = makePlan({
        grossIncomeCents: cents(500000),
        taxMode: 'simple',
        taxEffectiveRate: 0,
      });

      const bucket1 = crypto.randomUUID();
      const bucket2 = crypto.randomUUID();

      // Annual $1200 expense split $800 / $400
      const annualSplitExpense = makeExpense({
        planId: plan.id,
        bucketId: bucket1,
        name: 'Annual Insurance',
        amountCents: cents(120000), // $1200 annual
        frequency: 'annual',
        category: 'insurance',
        isSplit: true,
        splits: [
          {
            bucketId: bucket1,
            category: 'insurance',
            amountCents: cents(80000),
          },
          {
            bucketId: bucket2,
            category: 'healthcare',
            amountCents: cents(40000),
          },
        ],
      });

      const input: PlanComputeInput = {
        plan,
        buckets: [],
        expenses: [annualSplitExpense],
        taxComponents: [],
      };

      const summary = computePlanSummary(input, '2026-01');

      // Monthly total: $1200 / 12 = $100
      expect(summary.totalMonthlyExpenses).toBe(10000);
      // Insurance: $800 / 12 = $66.67 (rounded to 6667 cents)
      expect(summary.expensesByCategory.get('insurance')).toBe(6667);
      // Healthcare: $400 / 12 = $33.33 (rounded to 3333 cents)
      expect(summary.expensesByCategory.get('healthcare')).toBe(3333);
    });

    it('treats non-split expense with isSplit=false normally', () => {
      const plan = makePlan({
        grossIncomeCents: cents(500000),
        taxMode: 'simple',
        taxEffectiveRate: 0,
      });

      const bucket1 = crypto.randomUUID();

      const expense = makeExpense({
        planId: plan.id,
        bucketId: bucket1,
        name: 'Regular Expense',
        amountCents: cents(10000),
        category: 'groceries',
        isSplit: false,
        splits: undefined,
      });

      const input: PlanComputeInput = {
        plan,
        buckets: [],
        expenses: [expense],
        taxComponents: [],
      };

      const summary = computePlanSummary(input, '2026-01');

      expect(summary.totalMonthlyExpenses).toBe(10000);
      expect(summary.expensesByCategory.get('groceries')).toBe(10000);
      expect(summary.expensesByBucket.get(bucket1)).toBe(10000);
    });
  });
});
