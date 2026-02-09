import Dexie from 'dexie';
import { db } from '../db';
import type { Goal } from '@/domain/plan/types';
import { GoalSchema } from '@/domain/plan/schemas';

export const goalRepo = {
  async getByPlanId(planId: string): Promise<Goal[]> {
    return db.goals.where('planId').equals(planId).toArray();
  },

  async getById(id: string): Promise<Goal | undefined> {
    return db.goals.get(id);
  },

  async getActiveGoals(planId: string): Promise<Goal[]> {
    return db.goals
      .where('planId')
      .equals(planId)
      .filter((goal) => !goal.isCompleted)
      .toArray();
  },

  async getCompletedGoals(planId: string): Promise<Goal[]> {
    return db.goals
      .where('planId')
      .equals(planId)
      .filter((goal) => goal.isCompleted)
      .toArray();
  },

  async create(goal: Goal): Promise<Goal> {
    const validated = GoalSchema.parse(goal) as Goal;
    try {
      await db.goals.add(validated);
    } catch (error) {
      if (error instanceof Dexie.ConstraintError) {
        throw new Error(`Goal with id ${goal.id} already exists`);
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

  async update(goal: Goal): Promise<Goal> {
    const validated = GoalSchema.parse({
      ...goal,
      updatedAt: new Date().toISOString(),
    }) as Goal;
    try {
      await db.goals.put(validated);
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
    await db.goals.delete(id);
  },

  async deleteByPlanId(planId: string): Promise<void> {
    await db.goals.where('planId').equals(planId).delete();
  },

  async markCompleted(id: string): Promise<Goal | undefined> {
    const goal = await db.goals.get(id);
    if (!goal) return undefined;

    const updated: Goal = {
      ...goal,
      isCompleted: true,
      updatedAt: new Date().toISOString(),
    };

    await db.goals.put(updated);
    return updated;
  },
};
