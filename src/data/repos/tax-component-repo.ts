import Dexie from 'dexie';
import { db } from '../db';
import type { TaxComponent } from '@/domain/plan/types';
import { TaxComponentSchema } from '@/domain/plan/schemas';

export const taxComponentRepo = {
  async getByPlanId(planId: string): Promise<TaxComponent[]> {
    return db.taxComponents.where('planId').equals(planId).sortBy('sortOrder');
  },

  async create(component: TaxComponent): Promise<TaxComponent> {
    const validated = TaxComponentSchema.parse(component) as TaxComponent;
    try {
      await db.taxComponents.add(validated);
    } catch (error) {
      if (error instanceof Dexie.ConstraintError) {
        throw new Error(`Tax component with id ${component.id} already exists`);
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

  async update(component: TaxComponent): Promise<TaxComponent> {
    const validated = TaxComponentSchema.parse(component) as TaxComponent;
    try {
      await db.taxComponents.put(validated);
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
    await db.taxComponents.delete(id);
  },
};
