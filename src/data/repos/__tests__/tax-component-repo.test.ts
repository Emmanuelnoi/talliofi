import { describe, it, expect } from 'vitest';
import type { TaxComponent } from '@/domain/plan/types';
import { taxComponentRepo } from '../tax-component-repo';

function makeValidTaxComponent(
  overrides: Partial<TaxComponent> = {},
): TaxComponent {
  return {
    id: crypto.randomUUID(),
    planId: crypto.randomUUID(),
    name: 'Federal Tax',
    ratePercent: 22,
    sortOrder: 0,
    ...overrides,
  };
}

describe('taxComponentRepo', () => {
  describe('create()', () => {
    it('creates and returns a tax component', async () => {
      const component = makeValidTaxComponent();
      const created = await taxComponentRepo.create(component);

      expect(created.id).toBe(component.id);
      expect(created.name).toBe('Federal Tax');
    });

    it('throws when Zod validation fails', async () => {
      const invalid = {
        id: 'not-a-uuid',
        planId: 'bad',
        name: '',
        ratePercent: 150,
        sortOrder: -1,
      } as unknown as TaxComponent;

      await expect(taxComponentRepo.create(invalid)).rejects.toThrow();
    });
  });

  describe('getByPlanId()', () => {
    it('returns tax components sorted by sortOrder', async () => {
      const planId = crypto.randomUUID();

      await taxComponentRepo.create(
        makeValidTaxComponent({ planId, name: 'FICA', sortOrder: 2 }),
      );
      await taxComponentRepo.create(
        makeValidTaxComponent({ planId, name: 'Federal', sortOrder: 0 }),
      );
      await taxComponentRepo.create(
        makeValidTaxComponent({ planId, name: 'State', sortOrder: 1 }),
      );

      const result = await taxComponentRepo.getByPlanId(planId);

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Federal');
      expect(result[1].name).toBe('State');
      expect(result[2].name).toBe('FICA');
    });

    it('returns empty array when no components match', async () => {
      const result = await taxComponentRepo.getByPlanId(crypto.randomUUID());
      expect(result).toHaveLength(0);
    });
  });

  describe('update()', () => {
    it('updates a tax component', async () => {
      const component = makeValidTaxComponent();
      await taxComponentRepo.create(component);

      const updated = await taxComponentRepo.update({
        ...component,
        name: 'Updated Tax',
        ratePercent: 30,
      });

      expect(updated.name).toBe('Updated Tax');
      expect(updated.ratePercent).toBe(30);
    });
  });

  describe('delete()', () => {
    it('removes the tax component', async () => {
      const planId = crypto.randomUUID();
      const component = makeValidTaxComponent({ planId });
      await taxComponentRepo.create(component);

      await taxComponentRepo.delete(component.id);

      const result = await taxComponentRepo.getByPlanId(planId);
      expect(result).toHaveLength(0);
    });
  });
});
