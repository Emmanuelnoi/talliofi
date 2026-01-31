import { describe, it, expect } from 'vitest';
import { cents } from '@/domain/money';
import type { Plan, BucketAllocation, BucketAnalysis } from './types';
import { generateAlerts } from './rules';
import type { AlertContext } from './rules';

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

function makeBucketAnalysis(
  overrides: Partial<BucketAnalysis> = {},
): BucketAnalysis {
  return {
    bucketId: crypto.randomUUID(),
    bucketName: 'Test Bucket',
    targetPercentage: 30,
    actualPercentage: 30,
    targetAmountCents: cents(120000),
    actualAmountCents: cents(120000),
    varianceCents: cents(0),
    status: 'on_target',
    ...overrides,
  };
}

function makeContext(overrides: Partial<AlertContext> = {}): AlertContext {
  return {
    plan: makePlan(),
    buckets: [],
    netMonthlyIncome: cents(400000),
    totalMonthlyExpenses: cents(300000),
    bucketAnalysis: [],
    surplusOrDeficit: cents(100000),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// BUCKET_OVER_BUDGET
// ---------------------------------------------------------------------------

describe('BUCKET_OVER_BUDGET alert', () => {
  it('triggers when a bucket status is "over"', () => {
    const ba = makeBucketAnalysis({
      bucketName: 'Entertainment',
      status: 'over',
      targetPercentage: 10,
      actualPercentage: 12,
    });
    const ctx = makeContext({ bucketAnalysis: [ba] });

    const alerts = generateAlerts(ctx);
    const overAlert = alerts.find((a) => a.code === 'BUCKET_OVER_BUDGET');

    expect(overAlert).toBeDefined();
    expect(overAlert?.severity).toBe('warning');
    expect(overAlert?.relatedEntityId).toBe(ba.bucketId);
  });

  it('escalates to error severity when overage exceeds 20%', () => {
    const ba = makeBucketAnalysis({
      bucketName: 'Entertainment',
      status: 'over',
      targetPercentage: 10,
      actualPercentage: 15, // 50% over target
    });
    const ctx = makeContext({ bucketAnalysis: [ba] });

    const alerts = generateAlerts(ctx);
    const overAlert = alerts.find((a) => a.code === 'BUCKET_OVER_BUDGET');

    expect(overAlert?.severity).toBe('error');
  });

  it('does not trigger for "under" or "on_target" buckets', () => {
    const under = makeBucketAnalysis({ status: 'under' });
    const onTarget = makeBucketAnalysis({ status: 'on_target' });
    const ctx = makeContext({ bucketAnalysis: [under, onTarget] });

    const alerts = generateAlerts(ctx);
    const overAlerts = alerts.filter((a) => a.code === 'BUCKET_OVER_BUDGET');

    expect(overAlerts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// BUDGET_DEFICIT
// ---------------------------------------------------------------------------

describe('BUDGET_DEFICIT alert', () => {
  it('triggers when surplusOrDeficit is negative', () => {
    const ctx = makeContext({
      netMonthlyIncome: cents(400000),
      surplusOrDeficit: cents(-20000),
    });

    const alerts = generateAlerts(ctx);
    const deficitAlert = alerts.find((a) => a.code === 'BUDGET_DEFICIT');

    expect(deficitAlert).toBeDefined();
    expect(deficitAlert?.severity).toBe('warning');
  });

  it('escalates to error when deficit exceeds 10% of net income', () => {
    // 10% of 400000 = 40000. Deficit = -50000 => > 10%
    const ctx = makeContext({
      netMonthlyIncome: cents(400000),
      surplusOrDeficit: cents(-50000),
    });

    const alerts = generateAlerts(ctx);
    const deficitAlert = alerts.find((a) => a.code === 'BUDGET_DEFICIT');

    expect(deficitAlert?.severity).toBe('error');
  });

  it('does not trigger when surplus is positive', () => {
    const ctx = makeContext({ surplusOrDeficit: cents(100000) });

    const alerts = generateAlerts(ctx);
    const deficitAlerts = alerts.filter((a) => a.code === 'BUDGET_DEFICIT');

    expect(deficitAlerts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// ALLOCATIONS_EXCEED_100
// ---------------------------------------------------------------------------

describe('ALLOCATIONS_EXCEED_100 alert', () => {
  it('triggers when percentage buckets sum to more than 100%', () => {
    const buckets = [
      makeBucket({ mode: 'percentage', targetPercentage: 60 }),
      makeBucket({ mode: 'percentage', targetPercentage: 50 }),
    ];
    const ctx = makeContext({ buckets });

    const alerts = generateAlerts(ctx);
    const exceedAlert = alerts.find((a) => a.code === 'ALLOCATIONS_EXCEED_100');

    expect(exceedAlert).toBeDefined();
    expect(exceedAlert?.severity).toBe('error');
    expect(exceedAlert?.message).toContain('110.0%');
  });

  it('does not trigger when percentage buckets sum to 100% or less', () => {
    const buckets = [
      makeBucket({ mode: 'percentage', targetPercentage: 60 }),
      makeBucket({ mode: 'percentage', targetPercentage: 40 }),
    ];
    const ctx = makeContext({ buckets });

    const alerts = generateAlerts(ctx);
    const exceedAlerts = alerts.filter(
      (a) => a.code === 'ALLOCATIONS_EXCEED_100',
    );

    expect(exceedAlerts).toHaveLength(0);
  });

  it('ignores fixed-mode buckets in the sum', () => {
    const buckets = [
      makeBucket({ mode: 'percentage', targetPercentage: 90 }),
      makeBucket({
        mode: 'fixed',
        targetPercentage: undefined,
        targetAmountCents: cents(100000),
      }),
    ];
    const ctx = makeContext({ buckets });

    const alerts = generateAlerts(ctx);
    const exceedAlerts = alerts.filter(
      (a) => a.code === 'ALLOCATIONS_EXCEED_100',
    );

    expect(exceedAlerts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// NO_SAVINGS_BUCKET
// ---------------------------------------------------------------------------

describe('NO_SAVINGS_BUCKET alert', () => {
  it('triggers when no bucket name includes "saving"', () => {
    const ba = makeBucketAnalysis({ bucketName: 'Entertainment' });
    const ctx = makeContext({ bucketAnalysis: [ba] });

    const alerts = generateAlerts(ctx);
    const savingsAlert = alerts.find((a) => a.code === 'NO_SAVINGS_BUCKET');

    expect(savingsAlert).toBeDefined();
    expect(savingsAlert?.severity).toBe('info');
  });

  it('does not trigger when a bucket includes "saving" (case-insensitive)', () => {
    const ba = makeBucketAnalysis({ bucketName: 'Emergency Savings' });
    const ctx = makeContext({ bucketAnalysis: [ba] });

    const alerts = generateAlerts(ctx);
    const savingsAlerts = alerts.filter((a) => a.code === 'NO_SAVINGS_BUCKET');

    expect(savingsAlerts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Composite scenarios
// ---------------------------------------------------------------------------

describe('composite alert scenarios', () => {
  it('produces no critical alerts for a balanced budget with savings', () => {
    const ba = makeBucketAnalysis({
      bucketName: 'Savings',
      status: 'on_target',
    });
    const buckets = [makeBucket({ mode: 'percentage', targetPercentage: 50 })];
    const ctx = makeContext({
      buckets,
      bucketAnalysis: [ba],
      surplusOrDeficit: cents(100000),
    });

    const alerts = generateAlerts(ctx);
    const nonInfo = alerts.filter((a) => a.severity !== 'info');

    expect(nonInfo).toHaveLength(0);
  });

  it('fires multiple alerts simultaneously', () => {
    const overBucket = makeBucketAnalysis({
      bucketName: 'Entertainment',
      status: 'over',
      targetPercentage: 10,
      actualPercentage: 15,
    });
    const buckets = [
      makeBucket({ mode: 'percentage', targetPercentage: 60 }),
      makeBucket({ mode: 'percentage', targetPercentage: 50 }),
    ];
    const ctx = makeContext({
      buckets,
      bucketAnalysis: [overBucket],
      surplusOrDeficit: cents(-50000),
      netMonthlyIncome: cents(400000),
    });

    const alerts = generateAlerts(ctx);

    const codes = alerts.map((a) => a.code);
    expect(codes).toContain('BUCKET_OVER_BUDGET');
    expect(codes).toContain('BUDGET_DEFICIT');
    expect(codes).toContain('ALLOCATIONS_EXCEED_100');
    expect(codes).toContain('NO_SAVINGS_BUCKET');
  });
});
