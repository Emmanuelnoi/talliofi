import { describe, it, expect } from 'vitest';
import { cents } from '@/domain/money';
import type { Plan, MonthlySnapshot } from '@/domain/plan/types';
import { planRepo } from '../plan-repo';
import { snapshotRepo } from '../snapshot-repo';

function makeValidPlan(overrides: Partial<Plan> = {}): Plan {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: 'Test Plan',
    grossIncomeCents: cents(500000),
    incomeFrequency: 'monthly',
    taxMode: 'simple',
    taxEffectiveRate: 20,
    createdAt: now,
    updatedAt: now,
    version: 1,
    ...overrides,
  };
}

function makeSnapshot(
  planId: string,
  overrides: Partial<MonthlySnapshot> = {},
): MonthlySnapshot {
  return {
    id: crypto.randomUUID(),
    planId,
    yearMonth: '2026-01',
    grossIncomeCents: cents(500000),
    netIncomeCents: cents(400000),
    totalExpensesCents: cents(300000),
    bucketSummaries: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('snapshotRepo', () => {
  describe('upsert() and getByPlanId()', () => {
    it('creates and retrieves snapshots by planId', async () => {
      const plan = makeValidPlan();
      await planRepo.create(plan);

      const snap = makeSnapshot(plan.id);
      await snapshotRepo.upsert(snap);

      const results = await snapshotRepo.getByPlanId(plan.id);
      expect(results).toHaveLength(1);
      expect(results[0].yearMonth).toBe('2026-01');
    });

    it('returns empty array when no snapshots exist', async () => {
      const results = await snapshotRepo.getByPlanId(crypto.randomUUID());
      expect(results).toHaveLength(0);
    });

    it('sorts results by yearMonth ascending', async () => {
      const plan = makeValidPlan();
      await planRepo.create(plan);

      await snapshotRepo.upsert(
        makeSnapshot(plan.id, { yearMonth: '2026-03' }),
      );
      await snapshotRepo.upsert(
        makeSnapshot(plan.id, { yearMonth: '2026-01' }),
      );
      await snapshotRepo.upsert(
        makeSnapshot(plan.id, { yearMonth: '2026-02' }),
      );

      const results = await snapshotRepo.getByPlanId(plan.id);
      expect(results.map((s) => s.yearMonth)).toEqual([
        '2026-01',
        '2026-02',
        '2026-03',
      ]);
    });
  });

  describe('getByPlanAndMonth()', () => {
    it('retrieves a snapshot by compound key', async () => {
      const plan = makeValidPlan();
      await planRepo.create(plan);

      const snap = makeSnapshot(plan.id, { yearMonth: '2026-06' });
      await snapshotRepo.upsert(snap);

      const found = await snapshotRepo.getByPlanAndMonth(plan.id, '2026-06');
      expect(found).toBeDefined();
      expect(found?.id).toBe(snap.id);
    });

    it('returns undefined for non-existent month', async () => {
      const plan = makeValidPlan();
      await planRepo.create(plan);

      const found = await snapshotRepo.getByPlanAndMonth(plan.id, '2099-12');
      expect(found).toBeUndefined();
    });
  });

  describe('upsert()', () => {
    it('overwrites existing snapshot with same id', async () => {
      const plan = makeValidPlan();
      await planRepo.create(plan);

      const snapId = crypto.randomUUID();
      await snapshotRepo.upsert(
        makeSnapshot(plan.id, {
          id: snapId,
          totalExpensesCents: cents(100000),
        }),
      );
      await snapshotRepo.upsert(
        makeSnapshot(plan.id, {
          id: snapId,
          totalExpensesCents: cents(200000),
        }),
      );

      const results = await snapshotRepo.getByPlanId(plan.id);
      expect(results).toHaveLength(1);
      expect(results[0].totalExpensesCents).toBe(200000);
    });
  });

  describe('deleteByPlanId()', () => {
    it('removes all snapshots for a plan', async () => {
      const plan = makeValidPlan();
      await planRepo.create(plan);

      await snapshotRepo.upsert(
        makeSnapshot(plan.id, { yearMonth: '2026-01' }),
      );
      await snapshotRepo.upsert(
        makeSnapshot(plan.id, { yearMonth: '2026-02' }),
      );

      await snapshotRepo.deleteByPlanId(plan.id);
      const results = await snapshotRepo.getByPlanId(plan.id);
      expect(results).toHaveLength(0);
    });
  });
});
