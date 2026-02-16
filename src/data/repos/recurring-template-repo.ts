import { db } from '../db';
import type { RecurringTemplate } from '@/domain/plan/types';
import { RecurringTemplateSchema } from '@/domain/plan/schemas';
import { handleDexieWriteError } from './handle-dexie-error';
import type { CrudRepository } from './types';

/**
 * Repository for managing recurring expense templates.
 *
 * Recurring templates allow users to define expenses that should be
 * automatically generated at regular intervals (e.g., rent on the 1st,
 * subscriptions on the 15th).
 */
export const recurringTemplateRepo = {
  /**
   * Retrieves all recurring templates for a given plan.
   */
  async getByPlanId(planId: string): Promise<RecurringTemplate[]> {
    return db.recurringTemplates.where('planId').equals(planId).toArray();
  },

  /**
   * Retrieves only active recurring templates for a given plan.
   * Useful for the auto-generation service.
   */
  async getActiveByPlanId(planId: string): Promise<RecurringTemplate[]> {
    return db.recurringTemplates
      .where('[planId+isActive]')
      .equals([planId, 1])
      .toArray()
      .catch(() => {
        // Fallback if compound index not available
        return db.recurringTemplates
          .where('planId')
          .equals(planId)
          .filter((t) => t.isActive)
          .toArray();
      });
  },

  /**
   * Retrieves a single recurring template by ID.
   */
  async getById(id: string): Promise<RecurringTemplate | undefined> {
    return db.recurringTemplates.get(id);
  },

  /**
   * Retrieves templates that should generate expenses today.
   * Filters by dayOfMonth matching current day and active status.
   */
  async getTemplatesForToday(planId: string): Promise<RecurringTemplate[]> {
    const today = new Date();
    const currentDay = today.getDate();
    const todayIso = today.toISOString().split('T')[0];

    const templates = await this.getActiveByPlanId(planId);

    return templates.filter((t) => {
      // Skip if already generated today
      if (t.lastGeneratedDate === todayIso) {
        return false;
      }

      // If dayOfMonth is specified, check if it matches today
      if (t.dayOfMonth !== undefined) {
        // Handle months with fewer days (e.g., Feb 30 -> Feb 28)
        const lastDayOfMonth = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          0,
        ).getDate();

        const targetDay = Math.min(t.dayOfMonth, lastDayOfMonth);
        return currentDay === targetDay;
      }

      // If no dayOfMonth specified, generate on same day each month
      // based on creation date
      const createdDate = new Date(t.createdAt);
      const createdDay = createdDate.getDate();
      const lastDayOfMonth = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0,
      ).getDate();

      const targetDay = Math.min(createdDay, lastDayOfMonth);
      return currentDay === targetDay;
    });
  },

  /**
   * Creates a new recurring template.
   */
  async create(template: RecurringTemplate): Promise<RecurringTemplate> {
    const validated = RecurringTemplateSchema.parse(
      template,
    ) as RecurringTemplate;
    try {
      await db.recurringTemplates.add(validated);
    } catch (error) {
      handleDexieWriteError(error, 'Template', template.id);
    }
    return validated;
  },

  /**
   * Updates an existing recurring template.
   * Automatically updates the updatedAt timestamp.
   */
  async update(template: RecurringTemplate): Promise<RecurringTemplate> {
    const validated = RecurringTemplateSchema.parse({
      ...template,
      updatedAt: new Date().toISOString(),
    }) as RecurringTemplate;
    try {
      await db.recurringTemplates.put(validated);
    } catch (error) {
      handleDexieWriteError(error, 'Template', template.id);
    }
    return validated;
  },

  /**
   * Updates just the lastGeneratedDate field after generating an expense.
   * This is a lightweight update to prevent duplicate generation.
   */
  async updateLastGenerated(
    id: string,
    lastGeneratedDate: string,
  ): Promise<void> {
    await db.recurringTemplates.update(id, {
      lastGeneratedDate,
      updatedAt: new Date().toISOString(),
    });
  },

  /**
   * Toggles the active status of a template.
   */
  async toggleActive(id: string): Promise<RecurringTemplate | undefined> {
    const template = await this.getById(id);
    if (!template) return undefined;

    return this.update({
      ...template,
      isActive: !template.isActive,
    });
  },

  /**
   * Deletes a recurring template by ID.
   */
  async delete(id: string): Promise<void> {
    await db.recurringTemplates.delete(id);
  },

  /**
   * Deletes all recurring templates for a given plan.
   * Used when deleting an entire plan.
   */
  async deleteByPlanId(planId: string): Promise<void> {
    await db.recurringTemplates.where('planId').equals(planId).delete();
  },
} satisfies CrudRepository<RecurringTemplate> & {
  getActiveByPlanId(planId: string): Promise<RecurringTemplate[]>;
  getById(id: string): Promise<RecurringTemplate | undefined>;
  getTemplatesForToday(planId: string): Promise<RecurringTemplate[]>;
  updateLastGenerated(id: string, lastGeneratedDate: string): Promise<void>;
  toggleActive(id: string): Promise<RecurringTemplate | undefined>;
  deleteByPlanId(planId: string): Promise<void>;
};
