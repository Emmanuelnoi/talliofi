import Dexie from 'dexie';
import { db } from '../db';
import type { ExpenseItem } from '@/domain/plan/types';
import { ExpenseItemSchema } from '@/domain/plan/schemas';

export const expenseRepo = {
  async getByPlanId(planId: string): Promise<ExpenseItem[]> {
    return db.expenses.where('planId').equals(planId).toArray();
  },

  async getByBucketId(bucketId: string): Promise<ExpenseItem[]> {
    return db.expenses.where('bucketId').equals(bucketId).toArray();
  },

  async create(expense: ExpenseItem): Promise<ExpenseItem> {
    const validated = ExpenseItemSchema.parse(expense) as ExpenseItem;
    try {
      await db.expenses.add(validated);
    } catch (error) {
      if (error instanceof Dexie.ConstraintError) {
        throw new Error(`Expense with id ${expense.id} already exists`);
      }
      if (error instanceof Dexie.QuotaExceededError) {
        throw new Error(
          'Storage quota exceeded. Please free up space or export your data.',
        );
      }
      throw error;
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
      if (error instanceof Dexie.QuotaExceededError) {
        throw new Error(
          'Storage quota exceeded. Please free up space or export your data.',
        );
      }
      throw error;
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
      if (error instanceof Dexie.QuotaExceededError) {
        throw new Error(
          'Storage quota exceeded. Please free up space or export your data.',
        );
      }
      throw error;
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
};
