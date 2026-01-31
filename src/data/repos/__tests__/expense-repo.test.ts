import { describe, it, expect } from 'vitest';
import { cents } from '@/domain/money';
import type { ExpenseItem } from '@/domain/plan/types';
import { expenseRepo } from '../expense-repo';

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

describe('expenseRepo', () => {
  describe('create()', () => {
    it('creates and returns an expense', async () => {
      const expense = makeValidExpense();
      const created = await expenseRepo.create(expense);

      expect(created.id).toBe(expense.id);
      expect(created.name).toBe('Test Expense');
    });

    it('throws when Zod validation fails', async () => {
      const invalid = {
        id: 'not-a-uuid',
        planId: 'bad',
        bucketId: 'bad',
        name: '',
        amountCents: -1,
        frequency: 'monthly',
        category: 'housing',
        isFixed: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as unknown as ExpenseItem;

      await expect(expenseRepo.create(invalid)).rejects.toThrow();
    });
  });

  describe('getByPlanId()', () => {
    it('returns only expenses matching the given planId', async () => {
      const planId1 = crypto.randomUUID();
      const planId2 = crypto.randomUUID();

      await expenseRepo.create(
        makeValidExpense({ planId: planId1, name: 'Expense A' }),
      );
      await expenseRepo.create(
        makeValidExpense({ planId: planId1, name: 'Expense B' }),
      );
      await expenseRepo.create(
        makeValidExpense({ planId: planId2, name: 'Expense C' }),
      );

      const result = await expenseRepo.getByPlanId(planId1);
      expect(result).toHaveLength(2);
      expect(result.every((e) => e.planId === planId1)).toBe(true);
    });
  });

  describe('getByBucketId()', () => {
    it('returns only expenses matching the given bucketId', async () => {
      const bucketId1 = crypto.randomUUID();
      const bucketId2 = crypto.randomUUID();

      await expenseRepo.create(
        makeValidExpense({ bucketId: bucketId1, name: 'Expense A' }),
      );
      await expenseRepo.create(
        makeValidExpense({ bucketId: bucketId2, name: 'Expense B' }),
      );

      const result = await expenseRepo.getByBucketId(bucketId1);
      expect(result).toHaveLength(1);
      expect(result[0].bucketId).toBe(bucketId1);
    });
  });

  describe('update()', () => {
    it('updates the expense and sets new updatedAt', async () => {
      const expense = makeValidExpense();
      await expenseRepo.create(expense);

      const updated = await expenseRepo.update({
        ...expense,
        name: 'Updated Expense',
      });

      expect(updated.name).toBe('Updated Expense');
      // updatedAt should be refreshed
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(expense.updatedAt).getTime(),
      );
    });
  });

  describe('delete()', () => {
    it('removes a single expense', async () => {
      const expense = makeValidExpense();
      await expenseRepo.create(expense);

      await expenseRepo.delete(expense.id);

      const remaining = await expenseRepo.getByPlanId(expense.planId);
      expect(remaining).toHaveLength(0);
    });
  });

  describe('deleteByPlanId()', () => {
    it('removes all expenses for a given planId', async () => {
      const planId = crypto.randomUUID();
      const otherPlanId = crypto.randomUUID();

      await expenseRepo.create(makeValidExpense({ planId, name: 'A' }));
      await expenseRepo.create(makeValidExpense({ planId, name: 'B' }));
      await expenseRepo.create(
        makeValidExpense({ planId: otherPlanId, name: 'C' }),
      );

      await expenseRepo.deleteByPlanId(planId);

      expect(await expenseRepo.getByPlanId(planId)).toHaveLength(0);
      // Other plan's expenses should remain
      expect(await expenseRepo.getByPlanId(otherPlanId)).toHaveLength(1);
    });
  });
});
