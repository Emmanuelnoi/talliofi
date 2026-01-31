import { useQuery } from '@tanstack/react-query';
import { planRepo } from '@/data/repos/plan-repo';

export const ACTIVE_PLAN_QUERY_KEY = ['active-plan'] as const;

export function useActivePlan() {
  return useQuery({
    queryKey: ACTIVE_PLAN_QUERY_KEY,
    queryFn: async () => {
      const plan = await planRepo.getActive();
      return plan ?? null;
    },
  });
}
