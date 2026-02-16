import { db } from '../db';
import type { ExpenseItem } from '@/domain/plan/types';
import { ExpenseItemSchema } from '@/domain/plan/schemas';
import { handleDexieWriteError } from './handle-dexie-error';
import type { CrudRepository } from './types';

export const expenseRepo = {
  async getByPlanId(planId: string): Promise<ExpenseItem[]> {
    return db.expenses.where('planId').equals(planId).toArray();
  },

  async getByPlanIdAndDateRange(
    planId: string,
    startDate: string,
    endDate: string,
  ): Promise<ExpenseItem[]> {
    return db.expenses
      .where('[planId+transactionDate]')
      .between([planId, startDate], [planId, endDate], true, true)
      .toArray();
  },

  async getByBucketId(bucketId: string): Promise<ExpenseItem[]> {
    return db.expenses.where('bucketId').equals(bucketId).toArray();
  },

  async create(expense: ExpenseItem): Promise<ExpenseItem> {
    const validated = ExpenseItemSchema.parse(expense) as ExpenseItem;
    try {
      await db.expenses.add(validated);
    } catch (error) {
      handleDexieWriteError(error, 'Expense', expense.id);
    }
    return validated;
  },

  async update(expense: ExpenseItem): Promise<ExpenseItem> {
    const validated = ExpenseItemSchema.parse({
      ...expense,
      updatedAt: new Date().toISOString(),
    }) as ExpenseItem;
    try {
      await db.expenses.put(validated);
    } catch (error) {
      handleDexieWriteError(error, 'Expense', expense.id);
    }
    return validated;
  },

  async bulkUpdate(expenses: ExpenseItem[]): Promise<ExpenseItem[]> {
    if (expenses.length === 0) return [];
    const validated = expenses.map((expense) =>
      ExpenseItemSchema.parse({
        ...expense,
        updatedAt: new Date().toISOString(),
      }),
    ) as ExpenseItem[];
    try {
      await db.expenses.bulkPut(validated);
    } catch (error) {
      handleDexieWriteError(error, 'Expense');
    }
    return validated;
  },

  async delete(id: string): Promise<void> {
    await db.transaction('rw', [db.expenses, db.attachments], async () => {
      await db.expenses.delete(id);
      await db.attachments.where('expenseId').equals(id).delete();
    });
  },

  async bulkDelete(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await db.transaction('rw', [db.expenses, db.attachments], async () => {
      await db.expenses.bulkDelete(ids);
      await db.attachments.where('expenseId').anyOf(ids).delete();
    });
  },

  async deleteByPlanId(planId: string): Promise<void> {
    await db.expenses.where('planId').equals(planId).delete();
  },
} satisfies CrudRepository<ExpenseItem> & {
  getByPlanIdAndDateRange(
    planId: string,
    startDate: string,
    endDate: string,
  ): Promise<ExpenseItem[]>;
  getByBucketId(bucketId: string): Promise<ExpenseItem[]>;
  bulkUpdate(expenses: ExpenseItem[]): Promise<ExpenseItem[]>;
  bulkDelete(ids: string[]): Promise<void>;
  deleteByPlanId(planId: string): Promise<void>;
};
