import { useQuery } from '@tanstack/react-query';
import { bucketRepo } from '@/data/repos/bucket-repo';
import { expenseRepo } from '@/data/repos/expense-repo';
import { goalRepo } from '@/data/repos/goal-repo';
import { assetRepo } from '@/data/repos/asset-repo';
import { liabilityRepo } from '@/data/repos/liability-repo';
import { netWorthSnapshotRepo } from '@/data/repos/net-worth-snapshot-repo';
import { taxComponentRepo } from '@/data/repos/tax-component-repo';
import { recurringTemplateRepo } from '@/data/repos/recurring-template-repo';
import { PLAN_DATA_STALE_TIME_MS } from '@/lib/constants';

export function useBuckets(planId: string | undefined) {
  return useQuery({
    queryKey: ['buckets', planId],
    queryFn: () => bucketRepo.getByPlanId(planId!),
    enabled: !!planId,
    staleTime: PLAN_DATA_STALE_TIME_MS,
  });
}

export function useExpenses(planId: string | undefined) {
  return useQuery({
    queryKey: ['expenses', planId],
    queryFn: () => expenseRepo.getByPlanId(planId!),
    enabled: !!planId,
    staleTime: PLAN_DATA_STALE_TIME_MS,
  });
}

export function useTaxComponents(planId: string | undefined) {
  return useQuery({
    queryKey: ['tax-components', planId],
    queryFn: () => taxComponentRepo.getByPlanId(planId!),
    enabled: !!planId,
    staleTime: PLAN_DATA_STALE_TIME_MS,
  });
}

export function useGoals(planId: string | undefined) {
  return useQuery({
    queryKey: ['goals', planId],
    queryFn: () => goalRepo.getByPlanId(planId!),
    enabled: !!planId,
    staleTime: PLAN_DATA_STALE_TIME_MS,
  });
}

export function useAssets(planId: string | undefined) {
  return useQuery({
    queryKey: ['assets', planId],
    queryFn: () => assetRepo.getByPlanId(planId!),
    enabled: !!planId,
    staleTime: PLAN_DATA_STALE_TIME_MS,
  });
}

export function useLiabilities(planId: string | undefined) {
  return useQuery({
    queryKey: ['liabilities', planId],
    queryFn: () => liabilityRepo.getByPlanId(planId!),
    enabled: !!planId,
    staleTime: PLAN_DATA_STALE_TIME_MS,
  });
}

export function useNetWorthSnapshots(planId: string | undefined) {
  return useQuery({
    queryKey: ['net-worth-snapshots', planId],
    queryFn: () => netWorthSnapshotRepo.getByPlanId(planId!),
    enabled: !!planId,
    staleTime: PLAN_DATA_STALE_TIME_MS,
  });
}

export function useRecurringTemplates(planId: string | undefined) {
  return useQuery({
    queryKey: ['recurring-templates', planId],
    queryFn: () => recurringTemplateRepo.getByPlanId(planId!),
    enabled: !!planId,
    staleTime: PLAN_DATA_STALE_TIME_MS,
  });
}

export function useActiveRecurringTemplates(planId: string | undefined) {
  return useQuery({
    queryKey: ['recurring-templates-active', planId],
    queryFn: () => recurringTemplateRepo.getActiveByPlanId(planId!),
    enabled: !!planId,
    staleTime: PLAN_DATA_STALE_TIME_MS,
  });
}
