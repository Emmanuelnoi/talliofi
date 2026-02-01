import { useQuery } from '@tanstack/react-query';
import { bucketRepo } from '@/data/repos/bucket-repo';
import { expenseRepo } from '@/data/repos/expense-repo';
import { taxComponentRepo } from '@/data/repos/tax-component-repo';

/** Plan data changes infrequently — 5 min stale time avoids unnecessary refetches */
const PLAN_DATA_STALE_TIME = 5 * 60 * 1000;

export function useBuckets(planId: string | undefined) {
  return useQuery({
    queryKey: ['buckets', planId],
    queryFn: () => bucketRepo.getByPlanId(planId!),
    enabled: !!planId,
    staleTime: PLAN_DATA_STALE_TIME,
  });
}

export function useExpenses(planId: string | undefined) {
  return useQuery({
    queryKey: ['expenses', planId],
    queryFn: () => expenseRepo.getByPlanId(planId!),
    enabled: !!planId,
    staleTime: PLAN_DATA_STALE_TIME,
  });
}

export function useTaxComponents(planId: string | undefined) {
  return useQuery({
    queryKey: ['tax-components', planId],
    queryFn: () => taxComponentRepo.getByPlanId(planId!),
    enabled: !!planId,
    staleTime: PLAN_DATA_STALE_TIME,
  });
}
