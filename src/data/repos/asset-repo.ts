import Dexie from 'dexie';
import { db } from '../db';
import type { Asset } from '@/domain/plan/types';
import { AssetSchema } from '@/domain/plan/schemas';

export const assetRepo = {
  async getByPlanId(planId: string): Promise<Asset[]> {
    return db.assets.where('planId').equals(planId).toArray();
  },

  async getByCategory(
    planId: string,
    category: Asset['category'],
  ): Promise<Asset[]> {
    return db.assets
      .where('planId')
      .equals(planId)
      .filter((a) => a.category === category)
      .toArray();
  },

  async create(asset: Asset): Promise<Asset> {
    const validated = AssetSchema.parse(asset) as Asset;
    try {
      await db.assets.add(validated);
    } catch (error) {
      if (error instanceof Dexie.ConstraintError) {
        throw new Error(`Asset with id ${asset.id} already exists`);
      }
      if (error instanceof Dexie.QuotaExceededError) {
        throw new Error(
          'Storage quota exceeded. Please free up space or export your data.',
        );
      }
      throw error;
    }
    return validated;
  },

  async update(asset: Asset): Promise<Asset> {
    const validated = AssetSchema.parse({
      ...asset,
      updatedAt: new Date().toISOString(),
    }) as Asset;
    try {
      await db.assets.put(validated);
    } catch (error) {
      if (error instanceof Dexie.QuotaExceededError) {
        throw new Error(
          'Storage quota exceeded. Please free up space or export your data.',
        );
      }
      throw error;
    }
    return validated;
  },

  async delete(id: string): Promise<void> {
    await db.assets.delete(id);
  },

  async deleteByPlanId(planId: string): Promise<void> {
    await db.assets.where('planId').equals(planId).delete();
  },
};
