import { describe, it, expect } from 'vitest';
import { cents } from '@/domain/money';
import type { Goal } from '@/domain/plan/types';
import { goalRepo } from '../goal-repo';

function makeValidGoal(overrides: Partial<Goal> = {}): Goal {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    planId: crypto.randomUUID(),
    name: 'Test Goal',
    type: 'savings',
    targetAmountCents: cents(500000),
    currentAmountCents: cents(100000),
    color: '#4CAF50',
    isCompleted: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('goalRepo', () => {
  describe('create()', () => {
    it('creates and returns a goal', async () => {
      const goal = makeValidGoal();
      const created = await goalRepo.create(goal);

      expect(created.id).toBe(goal.id);
      expect(created.name).toBe('Test Goal');
    });

    it('throws when Zod validation fails', async () => {
      const invalid = {
        id: 'not-a-uuid',
        planId: 'bad',
        name: '',
        type: 'savings',
        targetAmountCents: cents(0),
        currentAmountCents: cents(0),
        color: 'red',
        isCompleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as unknown as Goal;

      await expect(goalRepo.create(invalid)).rejects.toThrow();
    });
  });

  describe('getByPlanId()', () => {
    it('returns all goals for a plan', async () => {
      const planId = crypto.randomUUID();

      await goalRepo.create(makeValidGoal({ planId, name: 'Goal A' }));
      await goalRepo.create(makeValidGoal({ planId, name: 'Goal B' }));

      const result = await goalRepo.getByPlanId(planId);
      expect(result).toHaveLength(2);
    });

    it('returns empty array when no goals match', async () => {
      const result = await goalRepo.getByPlanId(crypto.randomUUID());
      expect(result).toHaveLength(0);
    });
  });

  describe('getById()', () => {
    it('returns a goal by id', async () => {
      const goal = makeValidGoal();
      await goalRepo.create(goal);

      const found = await goalRepo.getById(goal.id);
      expect(found?.id).toBe(goal.id);
      expect(found?.name).toBe('Test Goal');
    });

    it('returns undefined for non-existent id', async () => {
      const found = await goalRepo.getById(crypto.randomUUID());
      expect(found).toBeUndefined();
    });
  });

  describe('getActiveGoals()', () => {
    it('returns only non-completed goals', async () => {
      const planId = crypto.randomUUID();

      await goalRepo.create(
        makeValidGoal({ planId, name: 'Active', isCompleted: false }),
      );
      await goalRepo.create(
        makeValidGoal({ planId, name: 'Done', isCompleted: true }),
      );

      const active = await goalRepo.getActiveGoals(planId);
      expect(active).toHaveLength(1);
      expect(active[0].name).toBe('Active');
    });
  });

  describe('getCompletedGoals()', () => {
    it('returns only completed goals', async () => {
      const planId = crypto.randomUUID();

      await goalRepo.create(
        makeValidGoal({ planId, name: 'Active', isCompleted: false }),
      );
      await goalRepo.create(
        makeValidGoal({ planId, name: 'Done', isCompleted: true }),
      );

      const completed = await goalRepo.getCompletedGoals(planId);
      expect(completed).toHaveLength(1);
      expect(completed[0].name).toBe('Done');
    });
  });

  describe('update()', () => {
    it('updates a goal', async () => {
      const goal = makeValidGoal();
      await goalRepo.create(goal);

      const updated = await goalRepo.update({
        ...goal,
        name: 'Updated Goal',
        currentAmountCents: cents(250000),
      });

      expect(updated.name).toBe('Updated Goal');
      expect(updated.currentAmountCents).toBe(cents(250000));
    });
  });

  describe('delete()', () => {
    it('removes the goal', async () => {
      const goal = makeValidGoal();
      await goalRepo.create(goal);

      await goalRepo.delete(goal.id);

      const found = await goalRepo.getById(goal.id);
      expect(found).toBeUndefined();
    });
  });

  describe('deleteByPlanId()', () => {
    it('removes all goals for a plan', async () => {
      const planId = crypto.randomUUID();

      await goalRepo.create(makeValidGoal({ planId }));
      await goalRepo.create(makeValidGoal({ planId }));

      await goalRepo.deleteByPlanId(planId);

      const result = await goalRepo.getByPlanId(planId);
      expect(result).toHaveLength(0);
    });
  });

  describe('markCompleted()', () => {
    it('marks a goal as completed', async () => {
      const goal = makeValidGoal({ isCompleted: false });
      await goalRepo.create(goal);

      const completed = await goalRepo.markCompleted(goal.id);

      expect(completed).toBeDefined();
      expect(completed!.isCompleted).toBe(true);
    });

    it('returns undefined for non-existent id', async () => {
      const result = await goalRepo.markCompleted(crypto.randomUUID());
      expect(result).toBeUndefined();
    });
  });
});
