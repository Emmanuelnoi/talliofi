import { describe, it, expect } from 'vitest';
import { cents } from '@/domain/money';
import type { BucketAllocation, ExpenseItem } from '@/domain/plan/types';
import { bucketRepo } from '../bucket-repo';
import { expenseRepo } from '../expense-repo';

function makeValidBucket(
  overrides: Partial<BucketAllocation> = {},
): BucketAllocation {
  return {
    id: crypto.randomUUID(),
    planId: crypto.randomUUID(),
    name: 'Test Bucket',
    color: '#FF0000',
    mode: 'percentage',
    targetPercentage: 30,
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeValidExpense(overrides: Partial<ExpenseItem> = {}): ExpenseItem {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    planId: crypto.randomUUID(),
    bucketId: crypto.randomUUID(),
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

describe('bucketRepo', () => {
  describe('create()', () => {
    it('creates and returns a bucket', async () => {
      const bucket = makeValidBucket();
      const created = await bucketRepo.create(bucket);

      expect(created.id).toBe(bucket.id);
      expect(created.name).toBe('Test Bucket');
    });

    it('throws when Zod validation fails', async () => {
      const invalid = {
        id: 'not-a-uuid',
        planId: 'bad',
        name: '',
        color: 'red',
        mode: 'percentage',
        sortOrder: 0,
        createdAt: new Date().toISOString(),
      } as unknown as BucketAllocation;

      await expect(bucketRepo.create(invalid)).rejects.toThrow();
    });
  });

  describe('getByPlanId()', () => {
    it('returns buckets sorted by sortOrder', async () => {
      const planId = crypto.randomUUID();

      await bucketRepo.create(
        makeValidBucket({ planId, name: 'Third', sortOrder: 2 }),
      );
      await bucketRepo.create(
        makeValidBucket({ planId, name: 'First', sortOrder: 0 }),
      );
      await bucketRepo.create(
        makeValidBucket({ planId, name: 'Second', sortOrder: 1 }),
      );

      const result = await bucketRepo.getByPlanId(planId);

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('First');
      expect(result[1].name).toBe('Second');
      expect(result[2].name).toBe('Third');
    });

    it('returns empty array when no buckets match', async () => {
      const result = await bucketRepo.getByPlanId(crypto.randomUUID());
      expect(result).toHaveLength(0);
    });
  });

  describe('update()', () => {
    it('updates a bucket', async () => {
      const bucket = makeValidBucket();
      await bucketRepo.create(bucket);

      const updated = await bucketRepo.update({
        ...bucket,
        name: 'Updated Bucket',
        targetPercentage: 50,
      });

      expect(updated.name).toBe('Updated Bucket');
      expect(updated.targetPercentage).toBe(50);
    });
  });

  describe('delete()', () => {
    it('removes the bucket and reassigns expenses (bucketId to empty string)', async () => {
      const planId = crypto.randomUUID();
      const bucket = makeValidBucket({ planId });
      await bucketRepo.create(bucket);

      // Create an expense linked to this bucket
      const expense = makeValidExpense({
        planId,
        bucketId: bucket.id,
      });
      await expenseRepo.create(expense);

      // Delete the bucket
      await bucketRepo.delete(bucket.id);

      // Bucket should be gone
      const buckets = await bucketRepo.getByPlanId(planId);
      expect(buckets).toHaveLength(0);

      // Expense should still exist but with empty bucketId
      const expenses = await expenseRepo.getByPlanId(planId);
      expect(expenses).toHaveLength(1);
      expect(expenses[0].bucketId).toBe('');
    });
  });
});
