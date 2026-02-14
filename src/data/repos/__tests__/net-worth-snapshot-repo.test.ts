import { describe, it, expect } from 'vitest';
import { cents } from '@/domain/money';
import type { NetWorthSnapshot } from '@/domain/plan/types';
import { netWorthSnapshotRepo } from '../net-worth-snapshot-repo';

function makeValidSnapshot(
  overrides: Partial<NetWorthSnapshot> = {},
): NetWorthSnapshot {
  return {
    id: crypto.randomUUID(),
    planId: crypto.randomUUID(),
    yearMonth: '2026-01',
    totalAssetsCents: cents(500000),
    totalLiabilitiesCents: cents(200000),
    netWorthCents: cents(300000),
    assetBreakdown: [{ category: 'cash', totalCents: cents(500000), count: 1 }],
    liabilityBreakdown: [
      { category: 'credit_card', totalCents: cents(200000), count: 1 },
    ],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('netWorthSnapshotRepo', () => {
  describe('upsert()', () => {
    it('inserts a new snapshot', async () => {
      const planId = crypto.randomUUID();
      const snapshot = makeValidSnapshot({ planId });

      await netWorthSnapshotRepo.upsert(snapshot);

      const result = await netWorthSnapshotRepo.getByPlanId(planId);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(snapshot.id);
    });

    it('updates an existing snapshot when called with the same id', async () => {
      const snapshot = makeValidSnapshot();
      await netWorthSnapshotRepo.upsert(snapshot);

      const updated = {
        ...snapshot,
        netWorthCents: cents(999999),
      };
      await netWorthSnapshotRepo.upsert(updated);

      const result = await netWorthSnapshotRepo.getByPlanId(snapshot.planId);
      expect(result).toHaveLength(1);
      expect(result[0].netWorthCents).toBe(cents(999999));
    });
  });

  describe('getByPlanId()', () => {
    it('returns snapshots sorted by yearMonth', async () => {
      const planId = crypto.randomUUID();

      await netWorthSnapshotRepo.upsert(
        makeValidSnapshot({ planId, yearMonth: '2026-03' }),
      );
      await netWorthSnapshotRepo.upsert(
        makeValidSnapshot({ planId, yearMonth: '2026-01' }),
      );
      await netWorthSnapshotRepo.upsert(
        makeValidSnapshot({ planId, yearMonth: '2026-02' }),
      );

      const result = await netWorthSnapshotRepo.getByPlanId(planId);

      expect(result).toHaveLength(3);
      expect(result[0].yearMonth).toBe('2026-01');
      expect(result[1].yearMonth).toBe('2026-02');
      expect(result[2].yearMonth).toBe('2026-03');
    });

    it('returns empty array when no snapshots match', async () => {
      const result = await netWorthSnapshotRepo.getByPlanId(
        crypto.randomUUID(),
      );
      expect(result).toHaveLength(0);
    });
  });

  describe('getByPlanAndMonth()', () => {
    it('returns the snapshot for a specific plan and month', async () => {
      const planId = crypto.randomUUID();
      const snapshot = makeValidSnapshot({ planId, yearMonth: '2026-06' });
      await netWorthSnapshotRepo.upsert(snapshot);

      const result = await netWorthSnapshotRepo.getByPlanAndMonth(
        planId,
        '2026-06',
      );

      expect(result).toBeDefined();
      expect(result!.id).toBe(snapshot.id);
    });

    it('returns undefined when no match exists', async () => {
      const result = await netWorthSnapshotRepo.getByPlanAndMonth(
        crypto.randomUUID(),
        '2099-12',
      );
      expect(result).toBeUndefined();
    });
  });

  describe('deleteByPlanId()', () => {
    it('removes all snapshots for a plan', async () => {
      const planId = crypto.randomUUID();

      await netWorthSnapshotRepo.upsert(
        makeValidSnapshot({ planId, yearMonth: '2026-01' }),
      );
      await netWorthSnapshotRepo.upsert(
        makeValidSnapshot({ planId, yearMonth: '2026-02' }),
      );

      await netWorthSnapshotRepo.deleteByPlanId(planId);

      const result = await netWorthSnapshotRepo.getByPlanId(planId);
      expect(result).toHaveLength(0);
    });

    it('does not affect other plans', async () => {
      const planA = crypto.randomUUID();
      const planB = crypto.randomUUID();

      await netWorthSnapshotRepo.upsert(makeValidSnapshot({ planId: planA }));
      await netWorthSnapshotRepo.upsert(makeValidSnapshot({ planId: planB }));

      await netWorthSnapshotRepo.deleteByPlanId(planA);

      const resultA = await netWorthSnapshotRepo.getByPlanId(planA);
      const resultB = await netWorthSnapshotRepo.getByPlanId(planB);
      expect(resultA).toHaveLength(0);
      expect(resultB).toHaveLength(1);
    });
  });
});
