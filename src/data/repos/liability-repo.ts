import Dexie from 'dexie';
import { db } from '../db';
import type { Liability } from '@/domain/plan/types';
import { LiabilitySchema } from '@/domain/plan/schemas';

export const liabilityRepo = {
  async getByPlanId(planId: string): Promise<Liability[]> {
    return db.liabilities.where('planId').equals(planId).toArray();
  },

  async getByCategory(
    planId: string,
    category: Liability['category'],
  ): Promise<Liability[]> {
    return db.liabilities
      .where('planId')
      .equals(planId)
      .filter((l) => l.category === category)
      .toArray();
  },

  async create(liability: Liability): Promise<Liability> {
    const validated = LiabilitySchema.parse(liability) as Liability;
    try {
      await db.liabilities.add(validated);
    } catch (error) {
      if (error instanceof Dexie.ConstraintError) {
        throw new Error(`Liability with id ${liability.id} already exists`);
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

  async update(liability: Liability): Promise<Liability> {
    const validated = LiabilitySchema.parse({
      ...liability,
      updatedAt: new Date().toISOString(),
    }) as Liability;
    try {
      await db.liabilities.put(validated);
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
    await db.liabilities.delete(id);
  },

  async deleteByPlanId(planId: string): Promise<void> {
    await db.liabilities.where('planId').equals(planId).delete();
  },
};
