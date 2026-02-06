import { planRepo } from '@/data/repos/plan-repo';
import { bucketRepo } from '@/data/repos/bucket-repo';
import { taxComponentRepo } from '@/data/repos/tax-component-repo';
import { expenseRepo } from '@/data/repos/expense-repo';
import { snapshotRepo } from '@/data/repos/snapshot-repo';

const EXPORT_VERSION = 1;

/**
 * Fetches all data for the given plan and serializes it
 * as a versioned JSON string suitable for file download.
 */
export async function exportData(planId: string): Promise<string> {
  const plan = await planRepo.getById(planId);
  if (!plan) {
    throw new Error(`Plan not found: ${planId}`);
  }

  const [buckets, taxComponents, expenses, snapshots] = await Promise.all([
    bucketRepo.getByPlanId(planId),
    taxComponentRepo.getByPlanId(planId),
    expenseRepo.getByPlanId(planId),
    snapshotRepo.getByPlanId(planId),
  ]);

  const payload = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    plan,
    buckets,
    taxComponents,
    expenses,
    snapshots,
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Creates a Blob from the JSON string and triggers a file download
 * in the browser via an ephemeral anchor element.
 */
export function downloadAsFile(json: string, filename: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();

  // Cleanup after a tick to allow the download to start
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 100);
}
