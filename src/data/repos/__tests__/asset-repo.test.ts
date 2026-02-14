import { describe, it, expect } from 'vitest';
import { cents } from '@/domain/money';
import type { Asset } from '@/domain/plan/types';
import { assetRepo } from '../asset-repo';

function makeValidAsset(overrides: Partial<Asset> = {}): Asset {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    planId: crypto.randomUUID(),
    name: 'Test Asset',
    category: 'cash',
    valueCents: cents(1000000),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('assetRepo', () => {
  describe('create()', () => {
    it('creates and returns an asset', async () => {
      const asset = makeValidAsset();
      const created = await assetRepo.create(asset);

      expect(created.id).toBe(asset.id);
      expect(created.name).toBe('Test Asset');
    });

    it('throws when Zod validation fails', async () => {
      const invalid = {
        id: 'not-a-uuid',
        planId: 'bad',
        name: '',
        category: 'invalid',
        valueCents: cents(0),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as unknown as Asset;

      await expect(assetRepo.create(invalid)).rejects.toThrow();
    });
  });

  describe('getByPlanId()', () => {
    it('returns all assets for a plan', async () => {
      const planId = crypto.randomUUID();

      await assetRepo.create(makeValidAsset({ planId, name: 'Asset A' }));
      await assetRepo.create(makeValidAsset({ planId, name: 'Asset B' }));

      const result = await assetRepo.getByPlanId(planId);
      expect(result).toHaveLength(2);
    });

    it('returns empty array when no assets match', async () => {
      const result = await assetRepo.getByPlanId(crypto.randomUUID());
      expect(result).toHaveLength(0);
    });
  });

  describe('getByCategory()', () => {
    it('returns assets filtered by category', async () => {
      const planId = crypto.randomUUID();

      await assetRepo.create(
        makeValidAsset({ planId, name: 'Savings', category: 'cash' }),
      );
      await assetRepo.create(
        makeValidAsset({ planId, name: 'Stocks', category: 'investment' }),
      );
      await assetRepo.create(
        makeValidAsset({ planId, name: 'Checking', category: 'cash' }),
      );

      const cashAssets = await assetRepo.getByCategory(planId, 'cash');
      expect(cashAssets).toHaveLength(2);
      expect(cashAssets.every((a) => a.category === 'cash')).toBe(true);
    });

    it('returns empty array when no assets match the category', async () => {
      const planId = crypto.randomUUID();

      await assetRepo.create(makeValidAsset({ planId, category: 'cash' }));

      const result = await assetRepo.getByCategory(planId, 'property');
      expect(result).toHaveLength(0);
    });
  });

  describe('update()', () => {
    it('updates an asset', async () => {
      const asset = makeValidAsset();
      await assetRepo.create(asset);

      const updated = await assetRepo.update({
        ...asset,
        name: 'Updated Asset',
        valueCents: cents(2000000),
      });

      expect(updated.name).toBe('Updated Asset');
      expect(updated.valueCents).toBe(cents(2000000));
    });
  });

  describe('delete()', () => {
    it('removes the asset', async () => {
      const planId = crypto.randomUUID();
      const asset = makeValidAsset({ planId });
      await assetRepo.create(asset);

      await assetRepo.delete(asset.id);

      const result = await assetRepo.getByPlanId(planId);
      expect(result).toHaveLength(0);
    });
  });

  describe('deleteByPlanId()', () => {
    it('removes all assets for a plan', async () => {
      const planId = crypto.randomUUID();

      await assetRepo.create(makeValidAsset({ planId }));
      await assetRepo.create(makeValidAsset({ planId }));

      await assetRepo.deleteByPlanId(planId);

      const result = await assetRepo.getByPlanId(planId);
      expect(result).toHaveLength(0);
    });
  });
});
