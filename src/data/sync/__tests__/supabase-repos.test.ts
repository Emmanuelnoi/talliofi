import { describe, it, expect } from 'vitest';
import { toSnake, toCamel } from '../supabase-repos';

describe('toSnake', () => {
  it('converts top-level camelCase keys to snake_case', () => {
    const result = toSnake({
      planId: 'p1',
      bucketId: 'b1',
      createdAt: '2024-01-01',
    });
    expect(result).toEqual({
      plan_id: 'p1',
      bucket_id: 'b1',
      created_at: '2024-01-01',
    });
  });

  it('preserves nested object keys (JSONB behavior)', () => {
    const expense = {
      id: '1',
      planId: 'p1',
      splits: [{ bucketId: 'b2', amountCents: 500, category: 'food' }],
    };
    const result = toSnake(expense);
    expect(result.plan_id).toBe('p1');
    // Nested splits should retain camelCase keys (stored as JSONB)
    expect(result.splits).toEqual([
      { bucketId: 'b2', amountCents: 500, category: 'food' },
    ]);
  });

  it('preserves nested bucketSummaries in snapshots', () => {
    const snapshot = {
      id: '1',
      planId: 'p1',
      yearMonth: '2024-01',
      bucketSummaries: [
        {
          bucketId: 'b1',
          bucketName: 'Essentials',
          allocatedCents: 1000,
          spentCents: 500,
          remainingCents: 500,
        },
      ],
    };
    const result = toSnake(snapshot);
    expect(result.plan_id).toBe('p1');
    expect(result.year_month).toBe('2024-01');
    expect(result.bucket_summaries).toEqual(snapshot.bucketSummaries);
  });
});

describe('toCamel', () => {
  it('converts top-level snake_case keys to camelCase', () => {
    const result = toCamel({
      plan_id: 'p1',
      bucket_id: 'b1',
      created_at: '2024-01-01',
    });
    expect(result).toEqual({
      planId: 'p1',
      bucketId: 'b1',
      createdAt: '2024-01-01',
    });
  });

  it('preserves nested object keys (JSONB behavior)', () => {
    const row = {
      id: '1',
      plan_id: 'p1',
      splits: [{ bucketId: 'b2', amountCents: 500 }],
    };
    const result = toCamel(row);
    expect(result.planId).toBe('p1');
    expect(result.splits).toEqual([{ bucketId: 'b2', amountCents: 500 }]);
  });
});

describe('round-trip: toSnake -> toCamel', () => {
  it('preserves expense with splits through round-trip', () => {
    const original = {
      id: '1',
      planId: 'p1',
      bucketId: 'b1',
      amountCents: 1000,
      splits: [
        {
          bucketId: 'b2',
          amountCents: 500,
          category: 'food',
          notes: 'lunch',
        },
        {
          bucketId: 'b3',
          amountCents: 500,
          category: 'transport',
          notes: null,
        },
      ],
    };
    const roundTripped = toCamel(toSnake(original) as Record<string, unknown>);
    expect(roundTripped).toEqual(original);
  });

  it('preserves snapshot with bucketSummaries through round-trip', () => {
    const original = {
      id: '1',
      planId: 'p1',
      yearMonth: '2024-01',
      bucketSummaries: [
        {
          bucketId: 'b1',
          bucketName: 'Essentials',
          allocatedCents: 2500,
          spentCents: 1200,
          remainingCents: 1300,
        },
      ],
    };
    const roundTripped = toCamel(toSnake(original) as Record<string, unknown>);
    expect(roundTripped).toEqual(original);
  });

  it('preserves net worth snapshot with nested breakdowns through round-trip', () => {
    const original = {
      id: '1',
      planId: 'p1',
      yearMonth: '2024-01',
      assetBreakdown: [{ category: 'savings', totalCents: 50000, count: 2 }],
      liabilityBreakdown: [
        { category: 'credit_card', totalCents: 5000, count: 1 },
      ],
    };
    const roundTripped = toCamel(toSnake(original) as Record<string, unknown>);
    expect(roundTripped).toEqual(original);
  });
});
