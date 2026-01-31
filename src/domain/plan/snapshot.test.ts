import { describe, it, expect } from 'vitest';
import { cents } from '@/domain/money';
import type {
  Plan,
  BucketAllocation,
  ExpenseItem,
  MonthlySnapshot,
} from './types';
import type { PlanComputeInput } from './calc';
import {
  createMonthlySnapshot,
  computeRollingAverages,
  calculateTrend,
} from './snapshot';

// ---------------------------------------------------------------------------
// Test factory helpers
// ---------------------------------------------------------------------------

function makePlan(overrides: Partial<Plan> = {}): Plan {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: 'Test Plan',
    grossIncomeCents: cents(500000),
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
    amountCents: cents(100000),
    frequency: 'monthly',
    category: 'housing',
    isFixed: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeSnapshot(
  overrides: Partial<MonthlySnapshot> = {},
): MonthlySnapshot {
  return {
    id: crypto.randomUUID(),
    planId: crypto.randomUUID(),
    yearMonth: '2026-01',
    grossIncomeCents: cents(500000),
    netIncomeCents: cents(400000),
    totalExpensesCents: cents(300000),
    bucketSummaries: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// createMonthlySnapshot()
// ---------------------------------------------------------------------------

describe('createMonthlySnapshot()', () => {
  it('captures correct values from computePlanSummary', () => {
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
      targetPercentage: 25,
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

    const snapshot = createMonthlySnapshot(input);

    expect(snapshot.planId).toBe(plan.id);
    expect(snapshot.grossIncomeCents).toBe(500000);
    // Net = 500000 - 20% = 400000
    expect(snapshot.netIncomeCents).toBe(400000);
    expect(snapshot.totalExpensesCents).toBe(100000);
    expect(snapshot.id).toBeTruthy();
    expect(snapshot.createdAt).toBeTruthy();
    expect(snapshot.yearMonth).toMatch(/^\d{4}-\d{2}$/);

    // Bucket summary should be present
    expect(snapshot.bucketSummaries).toHaveLength(1);
    expect(snapshot.bucketSummaries[0].bucketId).toBe(bucketId);
    expect(snapshot.bucketSummaries[0].bucketName).toBe(bucket.name);
    // Allocated = 25% of 400000 = 100000
    expect(snapshot.bucketSummaries[0].allocatedCents).toBe(100000);
    expect(snapshot.bucketSummaries[0].spentCents).toBe(100000);
  });
});

// ---------------------------------------------------------------------------
// computeRollingAverages()
// ---------------------------------------------------------------------------

describe('computeRollingAverages()', () => {
  it('returns null when there are not enough snapshots', () => {
    const snapshots = [makeSnapshot(), makeSnapshot()];
    const result = computeRollingAverages(snapshots, 3);
    expect(result).toBeNull();
  });

  it('computes correct average with exact count', () => {
    const snapshots = [
      makeSnapshot({ yearMonth: '2026-03', totalExpensesCents: cents(300000) }),
      makeSnapshot({ yearMonth: '2026-02', totalExpensesCents: cents(200000) }),
      makeSnapshot({ yearMonth: '2026-01', totalExpensesCents: cents(100000) }),
    ];

    const result = computeRollingAverages(snapshots, 3);

    expect(result).not.toBeNull();
    expect(result?.monthsIncluded).toBe(3);
    // Average = (300000 + 200000 + 100000) / 3 = 200000
    expect(result?.avgTotalExpenses).toBe(200000);
  });

  it('detects increasing trend', () => {
    // Sorted descending by yearMonth, so recent first
    const snapshots = [
      makeSnapshot({ yearMonth: '2026-03', totalExpensesCents: cents(400000) }),
      makeSnapshot({ yearMonth: '2026-02', totalExpensesCents: cents(350000) }),
      makeSnapshot({ yearMonth: '2026-01', totalExpensesCents: cents(200000) }),
    ];

    const result = computeRollingAverages(snapshots, 3);
    expect(result?.trend).toBe('increasing');
  });

  it('detects decreasing trend', () => {
    const snapshots = [
      makeSnapshot({ yearMonth: '2026-03', totalExpensesCents: cents(100000) }),
      makeSnapshot({ yearMonth: '2026-02', totalExpensesCents: cents(150000) }),
      makeSnapshot({ yearMonth: '2026-01', totalExpensesCents: cents(400000) }),
    ];

    const result = computeRollingAverages(snapshots, 3);
    expect(result?.trend).toBe('decreasing');
  });
});

// ---------------------------------------------------------------------------
// calculateTrend()
// ---------------------------------------------------------------------------

describe('calculateTrend()', () => {
  it('returns "increasing" when recent expenses are higher than older', () => {
    // calculateTrend splits: first half = [0..mid), second half = [mid..)
    // snapshots[0] is most recent in the sorted array from computeRollingAverages
    const snapshots = [
      makeSnapshot({ totalExpensesCents: cents(400000) }), // recent half
      makeSnapshot({ totalExpensesCents: cents(350000) }), // recent half
      makeSnapshot({ totalExpensesCents: cents(200000) }), // older half
      makeSnapshot({ totalExpensesCents: cents(180000) }), // older half
    ];

    expect(calculateTrend(snapshots)).toBe('increasing');
  });

  it('returns "decreasing" when recent expenses are lower than older', () => {
    const snapshots = [
      makeSnapshot({ totalExpensesCents: cents(100000) }), // recent half
      makeSnapshot({ totalExpensesCents: cents(120000) }), // recent half
      makeSnapshot({ totalExpensesCents: cents(300000) }), // older half
      makeSnapshot({ totalExpensesCents: cents(350000) }), // older half
    ];

    expect(calculateTrend(snapshots)).toBe('decreasing');
  });

  it('returns "stable" when change is within 5%', () => {
    const snapshots = [
      makeSnapshot({ totalExpensesCents: cents(200000) }),
      makeSnapshot({ totalExpensesCents: cents(201000) }),
      makeSnapshot({ totalExpensesCents: cents(199000) }),
      makeSnapshot({ totalExpensesCents: cents(200000) }),
    ];

    expect(calculateTrend(snapshots)).toBe('stable');
  });

  it('returns "stable" for a single snapshot', () => {
    const snapshots = [makeSnapshot()];
    expect(calculateTrend(snapshots)).toBe('stable');
  });

  it('returns "stable" when all expenses are zero', () => {
    const snapshots = [
      makeSnapshot({ totalExpensesCents: cents(0) }),
      makeSnapshot({ totalExpensesCents: cents(0) }),
      makeSnapshot({ totalExpensesCents: cents(0) }),
    ];

    expect(calculateTrend(snapshots)).toBe('stable');
  });
});
