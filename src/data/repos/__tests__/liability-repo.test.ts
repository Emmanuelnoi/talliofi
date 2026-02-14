import { describe, it, expect } from 'vitest';
import { cents } from '@/domain/money';
import type { Liability } from '@/domain/plan/types';
import { liabilityRepo } from '../liability-repo';

function makeValidLiability(overrides: Partial<Liability> = {}): Liability {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    planId: crypto.randomUUID(),
    name: 'Test Liability',
    category: 'credit_card',
    balanceCents: cents(500000),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('liabilityRepo', () => {
  describe('create()', () => {
    it('creates and returns a liability', async () => {
      const liability = makeValidLiability();
      const created = await liabilityRepo.create(liability);

      expect(created.id).toBe(liability.id);
      expect(created.name).toBe('Test Liability');
    });

    it('throws when Zod validation fails', async () => {
      const invalid = {
        id: 'not-a-uuid',
        planId: 'bad',
        name: '',
        category: 'invalid',
        balanceCents: cents(0),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as unknown as Liability;

      await expect(liabilityRepo.create(invalid)).rejects.toThrow();
    });
  });

  describe('getByPlanId()', () => {
    it('returns all liabilities for a plan', async () => {
      const planId = crypto.randomUUID();

      await liabilityRepo.create(
        makeValidLiability({ planId, name: 'Liability A' }),
      );
      await liabilityRepo.create(
        makeValidLiability({ planId, name: 'Liability B' }),
      );

      const result = await liabilityRepo.getByPlanId(planId);
      expect(result).toHaveLength(2);
    });

    it('returns empty array when no liabilities match', async () => {
      const result = await liabilityRepo.getByPlanId(crypto.randomUUID());
      expect(result).toHaveLength(0);
    });
  });

  describe('getByCategory()', () => {
    it('returns liabilities filtered by category', async () => {
      const planId = crypto.randomUUID();

      await liabilityRepo.create(
        makeValidLiability({ planId, name: 'Visa', category: 'credit_card' }),
      );
      await liabilityRepo.create(
        makeValidLiability({
          planId,
          name: 'Home Loan',
          category: 'mortgage',
        }),
      );
      await liabilityRepo.create(
        makeValidLiability({
          planId,
          name: 'Amex',
          category: 'credit_card',
        }),
      );

      const cards = await liabilityRepo.getByCategory(planId, 'credit_card');
      expect(cards).toHaveLength(2);
      expect(cards.every((l) => l.category === 'credit_card')).toBe(true);
    });

    it('returns empty array when no liabilities match the category', async () => {
      const planId = crypto.randomUUID();

      await liabilityRepo.create(
        makeValidLiability({ planId, category: 'credit_card' }),
      );

      const result = await liabilityRepo.getByCategory(planId, 'mortgage');
      expect(result).toHaveLength(0);
    });
  });

  describe('update()', () => {
    it('updates a liability', async () => {
      const liability = makeValidLiability({ interestRate: 18.5 });
      await liabilityRepo.create(liability);

      const updated = await liabilityRepo.update({
        ...liability,
        name: 'Updated Liability',
        balanceCents: cents(300000),
        interestRate: 15.0,
      });

      expect(updated.name).toBe('Updated Liability');
      expect(updated.balanceCents).toBe(cents(300000));
      expect(updated.interestRate).toBe(15.0);
    });
  });

  describe('delete()', () => {
    it('removes the liability', async () => {
      const planId = crypto.randomUUID();
      const liability = makeValidLiability({ planId });
      await liabilityRepo.create(liability);

      await liabilityRepo.delete(liability.id);

      const result = await liabilityRepo.getByPlanId(planId);
      expect(result).toHaveLength(0);
    });
  });

  describe('deleteByPlanId()', () => {
    it('removes all liabilities for a plan', async () => {
      const planId = crypto.randomUUID();

      await liabilityRepo.create(makeValidLiability({ planId }));
      await liabilityRepo.create(makeValidLiability({ planId }));

      await liabilityRepo.deleteByPlanId(planId);

      const result = await liabilityRepo.getByPlanId(planId);
      expect(result).toHaveLength(0);
    });
  });
});
