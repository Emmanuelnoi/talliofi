import { db } from '../db';
import type { ChangeLogEntry } from '@/domain/plan/types';

export const changelogRepo = {
  async getByPlanId(planId: string): Promise<ChangeLogEntry[]> {
    return db.changelog.where('planId').equals(planId).sortBy('timestamp');
  },

  async create(entry: ChangeLogEntry): Promise<void> {
    await db.changelog.add(entry);
  },

  async deleteByPlanId(planId: string): Promise<void> {
    await db.changelog.where('planId').equals(planId).delete();
  },
};
