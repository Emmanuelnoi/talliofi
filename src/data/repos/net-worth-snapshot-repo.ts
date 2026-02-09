import Dexie from 'dexie';
import { db } from '../db';
import type { NetWorthSnapshot } from '@/domain/plan/types';

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
      if (error instanceof Dexie.QuotaExceededError) {
        throw new Error(
          'Storage quota exceeded. Please free up space or export your data.',
        );
      }
      throw error;
    }
  },

  async deleteByPlanId(planId: string): Promise<void> {
    await db.netWorthSnapshots.where('planId').equals(planId).delete();
  },
};
