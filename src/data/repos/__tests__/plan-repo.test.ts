import { describe, it, expect } from 'vitest';
import { cents } from '@/domain/money';
import type { Plan } from '@/domain/plan/types';
import { planRepo } from '../plan-repo';
import { bucketRepo } from '../bucket-repo';
import { expenseRepo } from '../expense-repo';
import { taxComponentRepo } from '../tax-component-repo';
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

describe('planRepo', () => {
  describe('create()', () => {
    it('creates and returns a plan', async () => {
      const plan = makeValidPlan();
      const created = await planRepo.create(plan);

      expect(created.id).toBe(plan.id);
      expect(created.name).toBe('Test Plan');
    });

    it('throws when Zod validation fails (invalid data)', async () => {
      const invalidPlan = {
        id: 'not-a-uuid',
        name: '',
        grossIncomeCents: -1,
        incomeFrequency: 'monthly',
        taxMode: 'simple',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
      } as unknown as Plan;

      await expect(planRepo.create(invalidPlan)).rejects.toThrow();
    });
  });

  describe('getActive()', () => {
    it('returns the first plan ordered by createdAt ascending', async () => {
      const older = makeValidPlan({
        name: 'Older Plan',
        createdAt: '2026-01-01T00:00:00.000Z',
      });
      const newer = makeValidPlan({
        name: 'Newer Plan',
        createdAt: '2026-01-15T00:00:00.000Z',
      });

      // Insert in reverse order to ensure sorting works
      await planRepo.create(newer);
      await planRepo.create(older);

      const active = await planRepo.getActive();
      // orderBy('createdAt').limit(1) returns the first in ascending order
      expect(active).toBeDefined();
      expect(active?.name).toBe('Older Plan');
    });

    it('returns undefined when no plans exist', async () => {
      const active = await planRepo.getActive();
      expect(active).toBeUndefined();
    });
  });

  describe('getById()', () => {
    it('returns the plan when it exists', async () => {
      const plan = makeValidPlan();
      await planRepo.create(plan);

      const found = await planRepo.getById(plan.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(plan.id);
    });

    it('returns undefined for non-existent id', async () => {
      const found = await planRepo.getById(crypto.randomUUID());
      expect(found).toBeUndefined();
    });
  });

  describe('update()', () => {
    it('increments version and updates updatedAt', async () => {
      const plan = makeValidPlan({ version: 1 });
      await planRepo.create(plan);

      const updated = await planRepo.update({
        ...plan,
        name: 'Updated Plan',
      });

      expect(updated.version).toBe(2);
      expect(updated.name).toBe('Updated Plan');
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThan(
        new Date(plan.updatedAt).getTime() - 1,
      );
    });

    it('throws when plan does not exist', async () => {
      const plan = makeValidPlan();
      await expect(planRepo.update(plan)).rejects.toThrow('Plan not found');
    });
  });

  describe('delete()', () => {
    it('removes the plan and cascades to related entities', async () => {
      const plan = makeValidPlan();
      await planRepo.create(plan);

      const bucketId = crypto.randomUUID();
      const now = new Date().toISOString();

      // Create related entities
      await bucketRepo.create({
        id: bucketId,
        planId: plan.id,
        name: 'Housing',
        color: '#FF0000',
        mode: 'percentage',
        targetPercentage: 30,
        sortOrder: 0,
        createdAt: now,
      });

      await expenseRepo.create({
        id: crypto.randomUUID(),
        planId: plan.id,
        bucketId,
        name: 'Rent',
        amountCents: cents(150000),
        frequency: 'monthly',
        category: 'housing',
        isFixed: true,
        createdAt: now,
        updatedAt: now,
      });

      await taxComponentRepo.create({
        id: crypto.randomUUID(),
        planId: plan.id,
        name: 'Federal',
        ratePercent: 22,
        sortOrder: 0,
      });

      await snapshotRepo.upsert({
        id: crypto.randomUUID(),
        planId: plan.id,
        yearMonth: '2026-01',
        grossIncomeCents: cents(500000),
        netIncomeCents: cents(400000),
        totalExpensesCents: cents(300000),
        bucketSummaries: [],
        createdAt: now,
      });

      // Delete the plan
      await planRepo.delete(plan.id);

      // Verify everything is gone
      expect(await planRepo.getById(plan.id)).toBeUndefined();
      expect(await bucketRepo.getByPlanId(plan.id)).toHaveLength(0);
      expect(await expenseRepo.getByPlanId(plan.id)).toHaveLength(0);
      expect(await taxComponentRepo.getByPlanId(plan.id)).toHaveLength(0);
      expect(await snapshotRepo.getByPlanId(plan.id)).toHaveLength(0);
    });
  });
});
