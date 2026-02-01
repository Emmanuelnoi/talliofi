import { useMemo } from 'react';
import type { Plan, PlanSummary } from '@/domain/plan';
import { computePlanSummary } from '@/domain/plan';
import { useActivePlan } from '@/hooks/use-active-plan';
import {
  useBuckets,
  useExpenses,
  useTaxComponents,
} from '@/hooks/use-plan-data';

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

  const plan = activePlan.data ?? null;
  const bucketsData = bucketsQuery.data;
  const expensesData = expensesQuery.data;
  const taxData = taxQuery.data;

  const isLoading =
    activePlan.isLoading ||
    bucketsQuery.isLoading ||
    expensesQuery.isLoading ||
    taxQuery.isLoading;

  const summary = useMemo(() => {
    if (!plan) return null;

    return computePlanSummary({
      plan,
      buckets: bucketsData ?? EMPTY_ARRAY,
      expenses: expensesData ?? EMPTY_ARRAY,
      taxComponents: taxData ?? EMPTY_ARRAY,
    });
  }, [plan, bucketsData, expensesData, taxData]);

  return { summary, plan, isLoading };
}
