import Dexie from 'dexie';
import { db } from '../db';
import type { Plan } from '@/domain/plan/types';
import { PlanSchema } from '@/domain/plan/schemas';

export const planRepo = {
  async getActive(): Promise<Plan | undefined> {
    const plans = await db.plans.orderBy('createdAt').limit(1).toArray();
    return plans[0];
  },

  async getById(id: string): Promise<Plan | undefined> {
    return db.plans.get(id);
  },

  async create(plan: Plan): Promise<Plan> {
    const validated = PlanSchema.parse(plan) as Plan;
    try {
      await db.plans.add(validated);
    } catch (error) {
      if (error instanceof Dexie.ConstraintError) {
        throw new Error(`Plan with id ${plan.id} already exists`);
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

  async update(plan: Plan): Promise<Plan> {
    const existing = await db.plans.get(plan.id);
    if (!existing) throw new Error(`Plan not found: ${plan.id}`);

    const updated: Plan = {
      ...plan,
      version: existing.version + 1,
      updatedAt: new Date().toISOString(),
    };

    const validated = PlanSchema.parse(updated) as Plan;
    try {
      await db.plans.put(validated);
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
    try {
      await db.transaction(
        'rw',
        [db.plans, db.buckets, db.taxComponents, db.expenses, db.snapshots],
        async () => {
          await db.buckets.where('planId').equals(id).delete();
          await db.taxComponents.where('planId').equals(id).delete();
          await db.expenses.where('planId').equals(id).delete();
          await db.snapshots.where('planId').equals(id).delete();
          await db.plans.delete(id);
        },
      );
    } catch (error) {
      if (error instanceof Dexie.DatabaseClosedError) {
        throw new Error(
          'Database connection lost. Please refresh the application.',
        );
      }
      throw error;
    }
  },
};
