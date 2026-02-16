import { db } from '../db';
import type { NetWorthSnapshot } from '@/domain/plan/types';
import { handleDexieWriteError } from './handle-dexie-error';
import type { ReadRepository } from './types';

export const netWorthSnapshotRepo = {
  async getByPlanId(planId: string): Promise<NetWorthSnapshot[]> {
    return db.netWorthSnapshots
      .where('planId')
      .equals(planId)
      .sortBy('yearMonth');
  },

  async getByPlanAndMonth(
    planId: string,
    yearMonth: string,
  ): Promise<NetWorthSnapshot | undefined> {
    return db.netWorthSnapshots
      .where('[planId+yearMonth]')
      .equals([planId, yearMonth])
      .first();
  },

  async upsert(snapshot: NetWorthSnapshot): Promise<void> {
    try {
      await db.netWorthSnapshots.put(snapshot);
    } catch (error) {
      handleDexieWriteError(error, 'Net worth snapshot');
    }
  },

  async deleteByPlanId(planId: string): Promise<void> {
    await db.netWorthSnapshots.where('planId').equals(planId).delete();
  },
} satisfies ReadRepository<NetWorthSnapshot> & {
  getByPlanAndMonth(
    planId: string,
    yearMonth: string,
  ): Promise<NetWorthSnapshot | undefined>;
  upsert(snapshot: NetWorthSnapshot): Promise<void>;
  deleteByPlanId(planId: string): Promise<void>;
};
