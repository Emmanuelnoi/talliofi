import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { snapshotRepo } from '@/data/repos/snapshot-repo';
import { createMonthlySnapshot } from '@/domain/plan/snapshot';
import { useActivePlan } from './use-active-plan';
import { useBuckets, useExpenses, useTaxComponents } from './use-plan-data';

function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Auto-creates a monthly snapshot on app load if one doesn't exist for
 * the current month. Should be called once in the app layout so it runs
 * on every page, not just the history page.
 */
export function useAutoSnapshot(): { isCreating: boolean } {
  const hasRun = useRef(false);
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  const { data: plan } = useActivePlan();
  const planId = plan?.id;
  const { data: buckets } = useBuckets(planId);
  const { data: expenses } = useExpenses(planId);
  const { data: taxComponents } = useTaxComponents(planId);

  useEffect(() => {
    if (hasRun.current) return;
    if (!plan || !buckets || !expenses || !taxComponents) return;

    // Capture narrowed values so they remain non-undefined inside the closure
    const currentPlan = plan;
    const currentBuckets = buckets;
    const currentExpenses = expenses;
    const currentTaxComponents = taxComponents;

    hasRun.current = true;

    const yearMonth = getCurrentYearMonth();

    async function maybeCreateSnapshot() {
      setIsCreating(true);
      try {
        const existing = await snapshotRepo.getByPlanAndMonth(
          currentPlan.id,
          yearMonth,
        );

        if (existing) return;

        const snapshot = createMonthlySnapshot({
          plan: currentPlan,
          buckets: currentBuckets,
          expenses: currentExpenses,
          taxComponents: currentTaxComponents,
        });

        await snapshotRepo.upsert(snapshot);

        await queryClient.invalidateQueries({
          queryKey: ['snapshots', currentPlan.id],
        });
      } catch {
        // Snapshot creation is best-effort; do not crash the app
      } finally {
        setIsCreating(false);
      }
    }

    void maybeCreateSnapshot();
  }, [plan, buckets, expenses, taxComponents, queryClient]);

  return { isCreating };
}
