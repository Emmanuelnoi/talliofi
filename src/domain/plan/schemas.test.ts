import { describe, it, expect } from 'vitest';
import {
  PlanSchema,
  BucketAllocationSchema,
  TaxComponentSchema,
  ExpenseItemSchema,
  IncomeInputSchema,
  CreateExpenseInputSchema,
  ExportSchema,
} from './schemas';

const validUUID = () => crypto.randomUUID();

function makeValidPlan() {
  const now = new Date().toISOString();
  return {
    id: validUUID(),
    name: 'Test Plan',
    grossIncomeCents: 500000,
    incomeFrequency: 'monthly' as const,
    taxMode: 'simple' as const,
    taxEffectiveRate: 25,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
}

describe('PlanSchema', () => {
  it('validates a correct plan', () => {
    const plan = makeValidPlan();
    expect(() => PlanSchema.parse(plan)).not.toThrow();
  });

  it('fails when required fields are missing', () => {
    expect(() => PlanSchema.parse({})).toThrow();
  });

  it('fails with invalid UUID', () => {
    const plan = { ...makeValidPlan(), id: 'not-a-uuid' };
    expect(() => PlanSchema.parse(plan)).toThrow();
  });

  it('fails with negative income', () => {
    const plan = { ...makeValidPlan(), grossIncomeCents: -100 };
    expect(() => PlanSchema.parse(plan)).toThrow();
  });

  it('fails with invalid frequency', () => {
    const plan = { ...makeValidPlan(), incomeFrequency: 'daily' };
    expect(() => PlanSchema.parse(plan)).toThrow();
  });
});

describe('BucketAllocationSchema', () => {
  const now = new Date().toISOString();

  it('validates a percentage mode bucket', () => {
    const bucket = {
      id: validUUID(),
      planId: validUUID(),
      name: 'Housing',
      color: '#FF0000',
      mode: 'percentage' as const,
      targetPercentage: 30,
      sortOrder: 0,
      createdAt: now,
    };
    expect(() => BucketAllocationSchema.parse(bucket)).not.toThrow();
  });

  it('validates a fixed mode bucket', () => {
    const bucket = {
      id: validUUID(),
      planId: validUUID(),
      name: 'Emergency',
      color: '#00FF00',
      mode: 'fixed' as const,
      targetAmountCents: 50000,
      sortOrder: 1,
      createdAt: now,
    };
    expect(() => BucketAllocationSchema.parse(bucket)).not.toThrow();
  });

  it('fails when percentage mode lacks targetPercentage (refinement)', () => {
    const bucket = {
      id: validUUID(),
      planId: validUUID(),
      name: 'Housing',
      color: '#FF0000',
      mode: 'percentage' as const,
      sortOrder: 0,
      createdAt: now,
    };
    expect(() => BucketAllocationSchema.parse(bucket)).toThrow();
  });

  it('fails when fixed mode lacks targetAmountCents (refinement)', () => {
    const bucket = {
      id: validUUID(),
      planId: validUUID(),
      name: 'Emergency',
      color: '#00FF00',
      mode: 'fixed' as const,
      sortOrder: 1,
      createdAt: now,
    };
    expect(() => BucketAllocationSchema.parse(bucket)).toThrow();
  });
});

describe('TaxComponentSchema', () => {
  it('validates a correct tax component', () => {
    const tc = {
      id: validUUID(),
      planId: validUUID(),
      name: 'Federal',
      ratePercent: 22,
      sortOrder: 0,
    };
    expect(() => TaxComponentSchema.parse(tc)).not.toThrow();
  });

  it('fails when rate exceeds 100', () => {
    const tc = {
      id: validUUID(),
      planId: validUUID(),
      name: 'Federal',
      ratePercent: 101,
      sortOrder: 0,
    };
    expect(() => TaxComponentSchema.parse(tc)).toThrow();
  });

  it('fails with empty name', () => {
    const tc = {
      id: validUUID(),
      planId: validUUID(),
      name: '',
      ratePercent: 22,
      sortOrder: 0,
    };
    expect(() => TaxComponentSchema.parse(tc)).toThrow();
  });
});

describe('ExpenseItemSchema', () => {
  const now = new Date().toISOString();

  it('validates a correct expense', () => {
    const expense = {
      id: validUUID(),
      planId: validUUID(),
      bucketId: validUUID(),
      name: 'Rent',
      amountCents: 150000,
      frequency: 'monthly' as const,
      category: 'housing' as const,
      isFixed: true,
      createdAt: now,
      updatedAt: now,
    };
    expect(() => ExpenseItemSchema.parse(expense)).not.toThrow();
  });

  it('fails with negative amount', () => {
    const expense = {
      id: validUUID(),
      planId: validUUID(),
      bucketId: validUUID(),
      name: 'Rent',
      amountCents: -100,
      frequency: 'monthly' as const,
      category: 'housing' as const,
      isFixed: true,
      createdAt: now,
      updatedAt: now,
    };
    expect(() => ExpenseItemSchema.parse(expense)).toThrow();
  });

  it('fails with empty name', () => {
    const expense = {
      id: validUUID(),
      planId: validUUID(),
      bucketId: validUUID(),
      name: '',
      amountCents: 150000,
      frequency: 'monthly' as const,
      category: 'housing' as const,
      isFixed: true,
      createdAt: now,
      updatedAt: now,
    };
    expect(() => ExpenseItemSchema.parse(expense)).toThrow();
  });

  it('allows empty bucketId for orphaned expenses', () => {
    const expense = {
      id: validUUID(),
      planId: validUUID(),
      bucketId: '',
      name: 'Orphaned Expense',
      amountCents: 150000,
      frequency: 'monthly' as const,
      category: 'housing' as const,
      isFixed: true,
      createdAt: now,
      updatedAt: now,
    };
    expect(() => ExpenseItemSchema.parse(expense)).not.toThrow();
  });

  it('validates expense with transactionDate', () => {
    const expense = {
      id: validUUID(),
      planId: validUUID(),
      bucketId: validUUID(),
      name: 'Rent',
      amountCents: 150000,
      frequency: 'monthly' as const,
      category: 'housing' as const,
      isFixed: true,
      transactionDate: '2026-02-09',
      createdAt: now,
      updatedAt: now,
    };
    expect(() => ExpenseItemSchema.parse(expense)).not.toThrow();
  });

  it('allows undefined transactionDate for backwards compatibility', () => {
    const expense = {
      id: validUUID(),
      planId: validUUID(),
      bucketId: validUUID(),
      name: 'Rent',
      amountCents: 150000,
      frequency: 'monthly' as const,
      category: 'housing' as const,
      isFixed: true,
      createdAt: now,
      updatedAt: now,
    };
    expect(() => ExpenseItemSchema.parse(expense)).not.toThrow();
  });

  it('fails with invalid transactionDate format', () => {
    const expense = {
      id: validUUID(),
      planId: validUUID(),
      bucketId: validUUID(),
      name: 'Rent',
      amountCents: 150000,
      frequency: 'monthly' as const,
      category: 'housing' as const,
      isFixed: true,
      transactionDate: '02/09/2026', // Invalid format, should be YYYY-MM-DD
      createdAt: now,
      updatedAt: now,
    };
    expect(() => ExpenseItemSchema.parse(expense)).toThrow();
  });

  it('fails with invalid transactionDate string', () => {
    const expense = {
      id: validUUID(),
      planId: validUUID(),
      bucketId: validUUID(),
      name: 'Rent',
      amountCents: 150000,
      frequency: 'monthly' as const,
      category: 'housing' as const,
      isFixed: true,
      transactionDate: 'not-a-date',
      createdAt: now,
      updatedAt: now,
    };
    expect(() => ExpenseItemSchema.parse(expense)).toThrow();
  });

  // Split expense tests
  it('validates a split expense with correct splits summing to total', () => {
    const bucketId1 = validUUID();
    const bucketId2 = validUUID();
    const expense = {
      id: validUUID(),
      planId: validUUID(),
      bucketId: bucketId1,
      name: 'Grocery Run',
      amountCents: 10000, // $100.00
      frequency: 'monthly' as const,
      category: 'groceries' as const,
      isFixed: false,
      isSplit: true,
      splits: [
        { bucketId: bucketId1, category: 'groceries' as const, amountCents: 6000 },
        { bucketId: bucketId2, category: 'personal' as const, amountCents: 4000 },
      ],
      createdAt: now,
      updatedAt: now,
    };
    expect(() => ExpenseItemSchema.parse(expense)).not.toThrow();
  });

  it('fails when split expense has only one split', () => {
    const expense = {
      id: validUUID(),
      planId: validUUID(),
      bucketId: validUUID(),
      name: 'Invalid Split',
      amountCents: 10000,
      frequency: 'monthly' as const,
      category: 'groceries' as const,
      isFixed: false,
      isSplit: true,
      splits: [
        { bucketId: validUUID(), category: 'groceries' as const, amountCents: 10000 },
      ],
      createdAt: now,
      updatedAt: now,
    };
    expect(() => ExpenseItemSchema.parse(expense)).toThrow();
  });

  it('fails when split amounts do not sum to total', () => {
    const expense = {
      id: validUUID(),
      planId: validUUID(),
      bucketId: validUUID(),
      name: 'Mismatched Split',
      amountCents: 10000,
      frequency: 'monthly' as const,
      category: 'groceries' as const,
      isFixed: false,
      isSplit: true,
      splits: [
        { bucketId: validUUID(), category: 'groceries' as const, amountCents: 5000 },
        { bucketId: validUUID(), category: 'personal' as const, amountCents: 3000 },
      ],
      createdAt: now,
      updatedAt: now,
    };
    expect(() => ExpenseItemSchema.parse(expense)).toThrow();
  });

  it('allows non-split expense without splits array', () => {
    const expense = {
      id: validUUID(),
      planId: validUUID(),
      bucketId: validUUID(),
      name: 'Regular Expense',
      amountCents: 10000,
      frequency: 'monthly' as const,
      category: 'groceries' as const,
      isFixed: false,
      isSplit: false,
      createdAt: now,
      updatedAt: now,
    };
    expect(() => ExpenseItemSchema.parse(expense)).not.toThrow();
  });

  it('allows split with notes on individual allocations', () => {
    const expense = {
      id: validUUID(),
      planId: validUUID(),
      bucketId: validUUID(),
      name: 'Split with Notes',
      amountCents: 10000,
      frequency: 'monthly' as const,
      category: 'groceries' as const,
      isFixed: false,
      isSplit: true,
      splits: [
        {
          bucketId: validUUID(),
          category: 'groceries' as const,
          amountCents: 5000,
          notes: 'Food items',
        },
        {
          bucketId: validUUID(),
          category: 'personal' as const,
          amountCents: 5000,
          notes: 'Toiletries',
        },
      ],
      createdAt: now,
      updatedAt: now,
    };
    expect(() => ExpenseItemSchema.parse(expense)).not.toThrow();
  });
});

describe('IncomeInputSchema', () => {
  it('validates a correct income input', () => {
    expect(() =>
      IncomeInputSchema.parse({
        grossIncomeDollars: 5000,
        incomeFrequency: 'monthly',
      }),
    ).not.toThrow();
  });

  it('fails with non-positive dollars', () => {
    expect(() =>
      IncomeInputSchema.parse({
        grossIncomeDollars: 0,
        incomeFrequency: 'monthly',
      }),
    ).toThrow();
  });

  it('fails with invalid frequency', () => {
    expect(() =>
      IncomeInputSchema.parse({
        grossIncomeDollars: 5000,
        incomeFrequency: 'daily',
      }),
    ).toThrow();
  });
});

describe('CreateExpenseInputSchema', () => {
  it('validates a correct expense input', () => {
    expect(() =>
      CreateExpenseInputSchema.parse({
        name: 'Rent',
        amountDollars: 1500,
        frequency: 'monthly',
        category: 'housing',
        bucketId: validUUID(),
        isFixed: true,
      }),
    ).not.toThrow();
  });

  it('fails with non-positive dollar amount', () => {
    expect(() =>
      CreateExpenseInputSchema.parse({
        name: 'Rent',
        amountDollars: 0,
        frequency: 'monthly',
        category: 'housing',
        bucketId: validUUID(),
        isFixed: true,
      }),
    ).toThrow();
  });

  it('fails with missing name', () => {
    expect(() =>
      CreateExpenseInputSchema.parse({
        amountDollars: 1500,
        frequency: 'monthly',
        category: 'housing',
        bucketId: validUUID(),
      }),
    ).toThrow();
  });
});

describe('ExportSchema', () => {
  it('validates a correct export payload', () => {
    const now = new Date().toISOString();
    const planId = validUUID();
    const bucketId = validUUID();

    const payload = {
      version: 1,
      exportedAt: now,
      plan: makeValidPlan(),
      buckets: [
        {
          id: bucketId,
          planId,
          name: 'Housing',
          color: '#FF0000',
          mode: 'percentage' as const,
          targetPercentage: 30,
          sortOrder: 0,
          createdAt: now,
        },
      ],
      taxComponents: [
        {
          id: validUUID(),
          planId,
          name: 'Federal',
          ratePercent: 22,
          sortOrder: 0,
        },
      ],
      expenses: [
        {
          id: validUUID(),
          planId,
          bucketId,
          name: 'Rent',
          amountCents: 150000,
          frequency: 'monthly' as const,
          category: 'housing' as const,
          isFixed: true,
          createdAt: now,
          updatedAt: now,
        },
      ],
      snapshots: [
        {
          id: validUUID(),
          planId,
          yearMonth: '2026-01',
          grossIncomeCents: 500000,
          netIncomeCents: 375000,
          totalExpensesCents: 300000,
          bucketSummaries: [
            {
              bucketId,
              bucketName: 'Housing',
              allocatedCents: 112500,
              spentCents: 100000,
              remainingCents: 12500,
            },
          ],
          createdAt: now,
        },
      ],
    };

    expect(() => ExportSchema.parse(payload)).not.toThrow();
  });
});
