import Dexie from 'dexie';
import { db } from '../db';
import type { BucketAllocation } from '@/domain/plan/types';
import { BucketAllocationSchema } from '@/domain/plan/schemas';
import { handleDexieWriteError } from './handle-dexie-error';
import type { CrudRepository } from './types';

export const bucketRepo = {
  async getByPlanId(planId: string): Promise<BucketAllocation[]> {
    return db.buckets.where('planId').equals(planId).sortBy('sortOrder');
  },

  async create(bucket: BucketAllocation): Promise<BucketAllocation> {
    const validated = BucketAllocationSchema.parse(bucket) as BucketAllocation;
    try {
      await db.buckets.add(validated);
    } catch (error) {
      handleDexieWriteError(error, 'Bucket', bucket.id);
    }
    return validated;
  },

  async update(bucket: BucketAllocation): Promise<BucketAllocation> {
    const validated = BucketAllocationSchema.parse(bucket) as BucketAllocation;
    try {
      await db.buckets.put(validated);
    } catch (error) {
      handleDexieWriteError(error, 'Bucket', bucket.id);
    }
    return validated;
  },

  async delete(id: string): Promise<void> {
    try {
      await db.expenses.where('bucketId').equals(id).modify({ bucketId: '' });
      await db.buckets.delete(id);
    } catch (error) {
      if (error instanceof Dexie.DatabaseClosedError) {
        throw new Error(
          'Database connection lost. Please refresh the application.',
        );
      }
      throw error;
    }
  },
} satisfies CrudRepository<BucketAllocation>;
