import { useSyncStore } from '@/stores/sync-store';

// Local (Dexie) repos
import { planRepo } from './plan-repo';
import { bucketRepo } from './bucket-repo';
import { expenseRepo } from './expense-repo';
import { goalRepo } from './goal-repo';
import { assetRepo } from './asset-repo';
import { liabilityRepo } from './liability-repo';
import { netWorthSnapshotRepo } from './net-worth-snapshot-repo';
import { taxComponentRepo } from './tax-component-repo';
import { recurringTemplateRepo } from './recurring-template-repo';
import { attachmentRepo } from './attachment-repo';
import { exchangeRateRepo } from './exchange-rate-repo';

// Supabase (cloud) repos
import {
  supabasePlanRepo,
  supabaseBucketRepo,
  supabaseExpenseRepo,
  supabaseTaxComponentRepo,
} from '@/data/sync/supabase-repos';

/**
 * Checks whether the app is currently configured for cloud storage.
 * Called at runtime (not module load time) so it always reflects the
 * current Zustand state.
 */
function isCloudMode(): boolean {
  const mode = useSyncStore.getState().storageMode;
  return mode === 'cloud' || mode === 'encrypted';
}

// --- Repos with Supabase implementations: route based on storage mode ---

export function getPlanRepo(): typeof planRepo {
  return isCloudMode() ? supabasePlanRepo : planRepo;
}

export function getBucketRepo(): typeof bucketRepo {
  return isCloudMode() ? supabaseBucketRepo : bucketRepo;
}

export function getExpenseRepo(): typeof expenseRepo {
  return isCloudMode() ? supabaseExpenseRepo : expenseRepo;
}

export function getTaxComponentRepo(): typeof taxComponentRepo {
  return isCloudMode() ? supabaseTaxComponentRepo : taxComponentRepo;
}

// --- Repos without Supabase implementations: always return local ---

export function getGoalRepo(): typeof goalRepo {
  return goalRepo;
}

export function getAssetRepo(): typeof assetRepo {
  return assetRepo;
}

export function getLiabilityRepo(): typeof liabilityRepo {
  return liabilityRepo;
}

export function getNetWorthSnapshotRepo(): typeof netWorthSnapshotRepo {
  return netWorthSnapshotRepo;
}

export function getRecurringTemplateRepo(): typeof recurringTemplateRepo {
  return recurringTemplateRepo;
}

export function getAttachmentRepo(): typeof attachmentRepo {
  return attachmentRepo;
}

export function getExchangeRateRepo(): typeof exchangeRateRepo {
  return exchangeRateRepo;
}
