import Dexie from 'dexie';
import { db } from '../db';
import type { Plan } from '@/domain/plan/types';
import { PlanSchema } from '@/domain/plan/schemas';

/** Key for persisting active plan ID in localStorage */
const ACTIVE_PLAN_KEY = 'talliofi-active-plan-id';

export const planRepo = {
  /**
   * Returns the active plan based on localStorage preference.
   * Falls back to the first plan by creation date if no preference exists.
   */
  async getActive(): Promise<Plan | undefined> {
    const activePlanId = localStorage.getItem(ACTIVE_PLAN_KEY);
    if (activePlanId) {
      const plan = await db.plans.get(activePlanId);
      if (plan) return plan;
    }
    // Fallback to first plan
    const plans = await db.plans.orderBy('createdAt').limit(1).toArray();
    return plans[0];
  },

  /**
   * Sets the active plan by ID and persists to localStorage.
   */
  setActivePlanId(planId: string): void {
    localStorage.setItem(ACTIVE_PLAN_KEY, planId);
  },

  /**
   * Gets all plans ordered by creation date.
   */
  async getAll(): Promise<Plan[]> {
    return db.plans.orderBy('createdAt').toArray();
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
        [
          db.plans,
          db.buckets,
          db.taxComponents,
          db.expenses,
          db.goals,
          db.assets,
          db.liabilities,
          db.snapshots,
          db.netWorthSnapshots,
          db.recurringTemplates,
        ],
        async () => {
          await db.buckets.where('planId').equals(id).delete();
          await db.taxComponents.where('planId').equals(id).delete();
          await db.expenses.where('planId').equals(id).delete();
          await db.goals.where('planId').equals(id).delete();
          await db.assets.where('planId').equals(id).delete();
          await db.liabilities.where('planId').equals(id).delete();
          await db.snapshots.where('planId').equals(id).delete();
          await db.netWorthSnapshots.where('planId').equals(id).delete();
          await db.recurringTemplates.where('planId').equals(id).delete();
          await db.plans.delete(id);
        },
      );

      // Clear active plan if it was the deleted one
      const activePlanId = localStorage.getItem(ACTIVE_PLAN_KEY);
      if (activePlanId === id) {
        localStorage.removeItem(ACTIVE_PLAN_KEY);
      }
    } catch (error) {
      if (error instanceof Dexie.DatabaseClosedError) {
        throw new Error(
          'Database connection lost. Please refresh the application.',
        );
      }
      throw error;
    }
  },

  /**
   * Duplicates an existing plan with all its related data.
   * Returns the new plan with a new ID and name.
   */
  async duplicate(planId: string, newName: string): Promise<Plan> {
    const sourcePlan = await db.plans.get(planId);
    if (!sourcePlan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    const now = new Date().toISOString();
    const newPlanId = crypto.randomUUID();

    // Create mapping from old IDs to new IDs for buckets
    const bucketIdMap = new Map<string, string>();

    const newPlan: Plan = {
      ...sourcePlan,
      id: newPlanId,
      name: newName,
      createdAt: now,
      updatedAt: now,
      version: 0,
    };

    await db.transaction(
      'rw',
      [
        db.plans,
        db.buckets,
        db.taxComponents,
        db.expenses,
        db.goals,
        db.assets,
        db.liabilities,
        db.recurringTemplates,
      ],
      async () => {
        // Create new plan
        await db.plans.add(newPlan);

        // Copy buckets and build ID mapping
        const buckets = await db.buckets
          .where('planId')
          .equals(planId)
          .toArray();
        for (const bucket of buckets) {
          const newBucketId = crypto.randomUUID();
          bucketIdMap.set(bucket.id, newBucketId);
          await db.buckets.add({
            ...bucket,
            id: newBucketId,
            planId: newPlanId,
            createdAt: now,
          });
        }

        // Copy tax components
        const taxComponents = await db.taxComponents
          .where('planId')
          .equals(planId)
          .toArray();
        for (const tc of taxComponents) {
          await db.taxComponents.add({
            ...tc,
            id: crypto.randomUUID(),
            planId: newPlanId,
          });
        }

        // Copy expenses with new bucket IDs
        const expenses = await db.expenses
          .where('planId')
          .equals(planId)
          .toArray();
        for (const expense of expenses) {
          await db.expenses.add({
            ...expense,
            id: crypto.randomUUID(),
            planId: newPlanId,
            bucketId: bucketIdMap.get(expense.bucketId) ?? expense.bucketId,
            createdAt: now,
            updatedAt: now,
          });
        }

        // Copy goals
        const goals = await db.goals.where('planId').equals(planId).toArray();
        for (const goal of goals) {
          await db.goals.add({
            ...goal,
            id: crypto.randomUUID(),
            planId: newPlanId,
            createdAt: now,
            updatedAt: now,
          });
        }

        // Copy assets
        const assets = await db.assets.where('planId').equals(planId).toArray();
        for (const asset of assets) {
          await db.assets.add({
            ...asset,
            id: crypto.randomUUID(),
            planId: newPlanId,
            createdAt: now,
            updatedAt: now,
          });
        }

        // Copy liabilities
        const liabilities = await db.liabilities
          .where('planId')
          .equals(planId)
          .toArray();
        for (const liability of liabilities) {
          await db.liabilities.add({
            ...liability,
            id: crypto.randomUUID(),
            planId: newPlanId,
            createdAt: now,
            updatedAt: now,
          });
        }

        // Copy recurring templates with new bucket IDs
        const templates = await db.recurringTemplates
          .where('planId')
          .equals(planId)
          .toArray();
        for (const template of templates) {
          await db.recurringTemplates.add({
            ...template,
            id: crypto.randomUUID(),
            planId: newPlanId,
            bucketId: bucketIdMap.get(template.bucketId) ?? template.bucketId,
            createdAt: now,
            updatedAt: now,
          });
        }
      },
    );

    return newPlan;
  },
};
