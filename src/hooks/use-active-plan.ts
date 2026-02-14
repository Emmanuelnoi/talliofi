import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { getPlanRepo } from '@/data/repos/repo-router';
import { useUIStore } from '@/stores/ui-store';

export const ACTIVE_PLAN_QUERY_KEY = ['active-plan'] as const;
export const ALL_PLANS_QUERY_KEY = ['all-plans'] as const;
const ACTIVE_PLAN_LOAD_TIMEOUT_MS = 8_000;

/**
 * Hook to get the currently active plan.
 */
export function useActivePlan() {
  return useQuery({
    queryKey: ACTIVE_PLAN_QUERY_KEY,
    queryFn: async () => {
      const planPromise = getPlanRepo()
        .getActive()
        .then((plan) => plan ?? null);
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      let timedOut = false;
      const timeoutPromise = new Promise<null>((resolve) => {
        timeoutId = setTimeout(() => {
          timedOut = true;
          resolve(null);
        }, ACTIVE_PLAN_LOAD_TIMEOUT_MS);
      });

      const plan = await Promise.race([planPromise, timeoutPromise]);
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      if (timedOut && import.meta.env.DEV) {
        console.warn(
          '[useActivePlan] Plan lookup timed out. Falling back to onboarding.',
        );
      }
      return plan;
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
      return getPlanRepo().getAll();
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
      getPlanRepo().setActivePlanId(planId);
      // Invalidate all plan-related queries to refresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ACTIVE_PLAN_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ['buckets'] }),
        queryClient.invalidateQueries({ queryKey: ['expenses'] }),
        queryClient.invalidateQueries({ queryKey: ['tax-components'] }),
        queryClient.invalidateQueries({ queryKey: ['goals'] }),
        queryClient.invalidateQueries({ queryKey: ['assets'] }),
        queryClient.invalidateQueries({ queryKey: ['liabilities'] }),
        queryClient.invalidateQueries({ queryKey: ['snapshots'] }),
        queryClient.invalidateQueries({ queryKey: ['net-worth-snapshots'] }),
        queryClient.invalidateQueries({ queryKey: ['recurring-templates'] }),
        queryClient.invalidateQueries({
          queryKey: ['recurring-templates-active'],
        }),
        queryClient.invalidateQueries({ queryKey: ['plan-summary'] }),
      ]);
      incrementVersion();
    },
    [queryClient, incrementVersion],
  );

  return switchPlan;
}
