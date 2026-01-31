import Dexie from 'dexie';
import { db } from '../db';
import type { BucketAllocation } from '@/domain/plan/types';
import { BucketAllocationSchema } from '@/domain/plan/schemas';

export const bucketRepo = {
  async getByPlanId(planId: string): Promise<BucketAllocation[]> {
    return db.buckets.where('planId').equals(planId).sortBy('sortOrder');
  },

  async create(bucket: BucketAllocation): Promise<BucketAllocation> {
    const validated = BucketAllocationSchema.parse(bucket) as BucketAllocation;
    try {
      await db.buckets.add(validated);
    } catch (error) {
      if (error instanceof Dexie.ConstraintError) {
        throw new Error(`Bucket with id ${bucket.id} already exists`);
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

  async update(bucket: BucketAllocation): Promise<BucketAllocation> {
    const validated = BucketAllocationSchema.parse(bucket) as BucketAllocation;
    try {
      await db.buckets.put(validated);
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
};
