import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { planRepo } from '@/data/repos/plan-repo';
import { useUIStore } from '@/stores/ui-store';

export const ACTIVE_PLAN_QUERY_KEY = ['active-plan'] as const;
export const ALL_PLANS_QUERY_KEY = ['all-plans'] as const;

/**
 * Hook to get the currently active plan.
 */
export function useActivePlan() {
  return useQuery({
    queryKey: ACTIVE_PLAN_QUERY_KEY,
    queryFn: async () => {
      const plan = await planRepo.getActive();
      return plan ?? null;
    },
  });
}

/**
 * Hook to get all plans for the plan switcher.
 */
export function useAllPlans() {
  const planListVersion = useUIStore((s) => s.planListVersion);

  return useQuery({
    queryKey: [...ALL_PLANS_QUERY_KEY, planListVersion],
    queryFn: async () => {
      return planRepo.getAll();
    },
  });
}

/**
 * Hook that provides the ability to switch plans.
 * Returns a function to switch to a different plan.
 */
export function useSwitchPlan() {
  const queryClient = useQueryClient();
  const incrementVersion = useUIStore((s) => s.incrementPlanListVersion);

  const switchPlan = useCallback(
    async (planId: string) => {
      planRepo.setActivePlanId(planId);
      // Invalidate all plan-related queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ACTIVE_PLAN_QUERY_KEY });
      // Also invalidate plan-specific data queries
      await queryClient.invalidateQueries({ queryKey: ['buckets'] });
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      await queryClient.invalidateQueries({ queryKey: ['tax-components'] });
      await queryClient.invalidateQueries({ queryKey: ['goals'] });
      await queryClient.invalidateQueries({ queryKey: ['assets'] });
      await queryClient.invalidateQueries({ queryKey: ['liabilities'] });
      await queryClient.invalidateQueries({ queryKey: ['snapshots'] });
      await queryClient.invalidateQueries({ queryKey: ['net-worth-snapshots'] });
      await queryClient.invalidateQueries({ queryKey: ['recurring-templates'] });
      await queryClient.invalidateQueries({
        queryKey: ['recurring-templates-active'],
      });
      await queryClient.invalidateQueries({ queryKey: ['plan-summary'] });
      incrementVersion();
    },
    [queryClient, incrementVersion],
  );

  return switchPlan;
}
