import { useMemo } from 'react';
import type { Plan, PlanSummary } from '@/domain/plan';
import {
  computePlanSummary,
  getCurrentYearMonth,
  getRolloverMapFromSnapshots,
} from '@/domain/plan';
import { useActivePlan } from '@/hooks/use-active-plan';
import {
  useBuckets,
  useExpenses,
  useTaxComponents,
} from '@/hooks/use-plan-data';
import { useExchangeRates } from '@/hooks/use-plan-data';
import { DEFAULT_CURRENCY } from '@/domain/money';
import { convertExpensesToBase } from '@/lib/currency-conversion';
import { useSnapshots } from '@/hooks/use-snapshots';

const EMPTY_ARRAY = [] as const;

interface UsePlanSummaryResult {
  summary: PlanSummary | null;
  plan: Plan | null;
  isLoading: boolean;
}

/**
 * Combines all plan-related queries and computes a full PlanSummary.
 * Loading state is true until all four queries have resolved.
 */
export function usePlanSummary(): UsePlanSummaryResult {
  const activePlan = useActivePlan();
  const planId = activePlan.data?.id;

  const bucketsQuery = useBuckets(planId);
  const expensesQuery = useExpenses(planId);
  const taxQuery = useTaxComponents(planId);
  const snapshotsQuery = useSnapshots(planId);
  const exchangeRatesQuery = useExchangeRates(planId);

  const plan = activePlan.data ?? null;
  const bucketsData = bucketsQuery.data;
  const expensesData = expensesQuery.data;
  const taxData = taxQuery.data;
  const snapshotsData = snapshotsQuery.data;
  const exchangeRates = exchangeRatesQuery.data;

  const isLoading =
    activePlan.isLoading ||
    bucketsQuery.isLoading ||
    expensesQuery.isLoading ||
    taxQuery.isLoading ||
    snapshotsQuery.isLoading ||
    exchangeRatesQuery.isLoading;

  const summary = useMemo(() => {
    if (!plan) return null;

    const baseCurrency = plan.currencyCode ?? DEFAULT_CURRENCY;
    const convertedExpenses = convertExpensesToBase(
      expensesData ?? EMPTY_ARRAY,
      baseCurrency,
      exchangeRates ?? undefined,
    );

    const yearMonth = getCurrentYearMonth();
    const rolloverByBucket = snapshotsData
      ? getRolloverMapFromSnapshots(snapshotsData, yearMonth)
      : undefined;

    return computePlanSummary(
      {
        plan,
        buckets: bucketsData ?? EMPTY_ARRAY,
        expenses: convertedExpenses,
        taxComponents: taxData ?? EMPTY_ARRAY,
        rolloverByBucket,
      },
      yearMonth,
    );
  }, [plan, bucketsData, expensesData, taxData, snapshotsData, exchangeRates]);

  return { summary, plan, isLoading };
}
