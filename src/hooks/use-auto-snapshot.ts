import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { snapshotRepo } from '@/data/repos/snapshot-repo';
import { createMonthlySnapshot } from '@/domain/plan/snapshot';
import {
  getCurrentYearMonth,
  getRolloverMapFromSnapshots,
} from '@/domain/plan';
import { useActivePlan } from './use-active-plan';
import {
  useBuckets,
  useExpenses,
  useTaxComponents,
  useExchangeRates,
} from './use-plan-data';
import { useSnapshots } from './use-snapshots';
import { useLocalEncryption } from './use-local-encryption';
import { convertExpensesToBase } from '@/lib/currency-conversion';
import { DEFAULT_CURRENCY } from '@/domain/money';

/**
 * Auto-creates a monthly snapshot on app load if one doesn't exist for
 * the current month. Should be called once in the app layout so it runs
 * on every page, not just the history page.
 */
export function useAutoSnapshot(): { isCreating: boolean } {
  const hasRun = useRef(false);
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();
  const { scheduleVaultSave } = useLocalEncryption();

  const { data: plan } = useActivePlan();
  const planId = plan?.id;
  const { data: buckets } = useBuckets(planId);
  const { data: expenses } = useExpenses(planId);
  const { data: taxComponents } = useTaxComponents(planId);
  const { data: snapshots } = useSnapshots(planId);
  const { data: exchangeRates } = useExchangeRates(planId);

  useEffect(() => {
    if (hasRun.current) return;
    if (!plan || !buckets || !expenses || !taxComponents) return;

    // Capture narrowed values so they remain non-undefined inside the closure
    const currentPlan = plan;
    const currentBuckets = buckets;
    const baseCurrency = plan.currencyCode ?? DEFAULT_CURRENCY;
    const currentExpenses = convertExpensesToBase(
      expenses,
      baseCurrency,
      exchangeRates ?? undefined,
    );
    const currentTaxComponents = taxComponents;
    const currentSnapshots = snapshots ?? [];

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

        const rolloverByBucket = getRolloverMapFromSnapshots(
          currentSnapshots,
          yearMonth,
        );
        const snapshot = createMonthlySnapshot({
          plan: currentPlan,
          buckets: currentBuckets,
          expenses: currentExpenses,
          taxComponents: currentTaxComponents,
          rolloverByBucket,
        });

        await snapshotRepo.upsert(snapshot);

        await queryClient.invalidateQueries({
          queryKey: ['snapshots', currentPlan.id],
        });
        scheduleVaultSave();
      } catch (error) {
        // Snapshot creation is best-effort; do not crash the app
        if (import.meta.env.DEV) {
          console.warn('[auto-snapshot] Failed to create snapshot', error);
        }
      } finally {
        setIsCreating(false);
      }
    }

    void maybeCreateSnapshot();
  }, [
    plan,
    buckets,
    expenses,
    taxComponents,
    snapshots,
    exchangeRates,
    queryClient,
    scheduleVaultSave,
  ]);

  return { isCreating };
}
