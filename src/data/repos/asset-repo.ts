import { db } from '../db';
import type { Asset } from '@/domain/plan/types';
import { AssetSchema } from '@/domain/plan/schemas';
import { handleDexieWriteError } from './handle-dexie-error';
import type { CrudRepository } from './types';

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
      handleDexieWriteError(error, 'Asset', asset.id);
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
      handleDexieWriteError(error, 'Asset', asset.id);
    }
    return validated;
  },

  async delete(id: string): Promise<void> {
    await db.assets.delete(id);
  },

  async deleteByPlanId(planId: string): Promise<void> {
    await db.assets.where('planId').equals(planId).delete();
  },
} satisfies CrudRepository<Asset> & {
  getByCategory(planId: string, category: Asset['category']): Promise<Asset[]>;
  deleteByPlanId(planId: string): Promise<void>;
};
