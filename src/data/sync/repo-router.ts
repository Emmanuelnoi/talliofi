import { planRepo } from '@/data/repos/plan-repo';
import { bucketRepo } from '@/data/repos/bucket-repo';
import { taxComponentRepo } from '@/data/repos/tax-component-repo';
import { expenseRepo } from '@/data/repos/expense-repo';
import { snapshotRepo } from '@/data/repos/snapshot-repo';
import {
  supabasePlanRepo,
  supabaseBucketRepo,
  supabaseTaxComponentRepo,
  supabaseExpenseRepo,
  supabaseSnapshotRepo,
} from './supabase-repos';

type StorageMode = 'local' | 'cloud';

/**
 * The full set of repos that the application consumes.
 * Each member matches the interface of its Dexie counterpart.
 */
export interface RepoSet {
  planRepo: typeof planRepo;
  bucketRepo: typeof bucketRepo;
  taxComponentRepo: typeof taxComponentRepo;
  expenseRepo: typeof expenseRepo;
  snapshotRepo: typeof snapshotRepo;
}

const dexieRepos: RepoSet = {
  planRepo,
  bucketRepo,
  taxComponentRepo,
  expenseRepo,
  snapshotRepo,
};

const supabaseRepos: RepoSet = {
  planRepo: supabasePlanRepo,
  bucketRepo: supabaseBucketRepo,
  taxComponentRepo: supabaseTaxComponentRepo,
  expenseRepo: supabaseExpenseRepo,
  snapshotRepo: supabaseSnapshotRepo,
};

/**
 * Strategy pattern that returns the correct repo implementation
 * based on the current storage mode. Defaults to local (Dexie).
 */
export function getRepoStrategy(storageMode: StorageMode): RepoSet {
  if (storageMode === 'cloud') return supabaseRepos;
  return dexieRepos;
}
