import { db } from '../db';
import type { MonthlySnapshot } from '@/domain/plan/types';
import { handleDexieWriteError } from './handle-dexie-error';

export const snapshotRepo = {
  async getByPlanId(planId: string): Promise<MonthlySnapshot[]> {
    return db.snapshots.where('planId').equals(planId).sortBy('yearMonth');
  },

  async getByPlanAndMonth(
    planId: string,
    yearMonth: string,
  ): Promise<MonthlySnapshot | undefined> {
    return db.snapshots
      .where('[planId+yearMonth]')
      .equals([planId, yearMonth])
      .first();
  },

  async upsert(snapshot: MonthlySnapshot): Promise<void> {
    try {
      await db.snapshots.put(snapshot);
    } catch (error) {
      handleDexieWriteError(error, 'Snapshot');
    }
  },

  async deleteByPlanId(planId: string): Promise<void> {
    await db.snapshots.where('planId').equals(planId).delete();
  },
};
