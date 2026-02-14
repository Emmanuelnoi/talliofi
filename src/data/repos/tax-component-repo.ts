import { db } from '../db';
import type { TaxComponent } from '@/domain/plan/types';
import { TaxComponentSchema } from '@/domain/plan/schemas';
import { handleDexieWriteError } from './handle-dexie-error';

export const taxComponentRepo = {
  async getByPlanId(planId: string): Promise<TaxComponent[]> {
    return db.taxComponents.where('planId').equals(planId).sortBy('sortOrder');
  },

  async create(component: TaxComponent): Promise<TaxComponent> {
    const validated = TaxComponentSchema.parse(component) as TaxComponent;
    try {
      await db.taxComponents.add(validated);
    } catch (error) {
      handleDexieWriteError(error, 'Tax component', component.id);
    }
    return validated;
  },

  async update(component: TaxComponent): Promise<TaxComponent> {
    const validated = TaxComponentSchema.parse(component) as TaxComponent;
    try {
      await db.taxComponents.put(validated);
    } catch (error) {
      handleDexieWriteError(error, 'Tax component', component.id);
    }
    return validated;
  },

  async delete(id: string): Promise<void> {
    await db.taxComponents.delete(id);
  },
};
