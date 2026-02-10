import Dexie from 'dexie';
import { db } from '../db';
import type { ExpenseAttachment } from '@/domain/plan/types';
import { ExpenseAttachmentSchema } from '@/domain/plan/schemas';

export const attachmentRepo = {
  async getByExpenseId(expenseId: string): Promise<ExpenseAttachment[]> {
    return db.attachments.where('expenseId').equals(expenseId).toArray();
  },

  async create(attachment: ExpenseAttachment): Promise<ExpenseAttachment> {
    const validated = ExpenseAttachmentSchema.parse(
      attachment,
    ) as ExpenseAttachment;
    try {
      await db.attachments.add(validated);
    } catch (error) {
      if (error instanceof Dexie.ConstraintError) {
        throw new Error(`Attachment with id ${attachment.id} already exists`);
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

  async bulkCreate(
    attachments: ExpenseAttachment[],
  ): Promise<ExpenseAttachment[]> {
    if (attachments.length === 0) return [];
    const validated = attachments.map((attachment) =>
      ExpenseAttachmentSchema.parse(attachment),
    ) as ExpenseAttachment[];
    try {
      await db.attachments.bulkAdd(validated);
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
    await db.attachments.delete(id);
  },

  async deleteByExpenseId(expenseId: string): Promise<void> {
    await db.attachments.where('expenseId').equals(expenseId).delete();
  },

  async deleteByExpenseIds(expenseIds: string[]): Promise<void> {
    if (expenseIds.length === 0) return;
    await db.attachments.where('expenseId').anyOf(expenseIds).delete();
  },

  async deleteByPlanId(planId: string): Promise<void> {
    await db.attachments.where('planId').equals(planId).delete();
  },
};
