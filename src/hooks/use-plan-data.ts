import { useQuery } from '@tanstack/react-query';
import {
  getBucketRepo,
  getExpenseRepo,
  getGoalRepo,
  getAssetRepo,
  getLiabilityRepo,
  getNetWorthSnapshotRepo,
  getTaxComponentRepo,
  getRecurringTemplateRepo,
  getAttachmentRepo,
  getExchangeRateRepo,
} from '@/data/repos/repo-router';
import { PLAN_DATA_STALE_TIME_MS } from '@/lib/constants';

export function useBuckets(planId: string | undefined) {
  return useQuery({
    queryKey: ['buckets', planId],
    queryFn: () => getBucketRepo().getByPlanId(planId!),
    enabled: !!planId,
    staleTime: PLAN_DATA_STALE_TIME_MS,
  });
}

export function useExpenses(planId: string | undefined) {
  return useQuery({
    queryKey: ['expenses', planId],
    queryFn: () => getExpenseRepo().getByPlanId(planId!),
    enabled: !!planId,
    staleTime: PLAN_DATA_STALE_TIME_MS,
  });
}

export function useExpensesByDateRange(
  planId: string | undefined,
  startDate: string,
  endDate: string,
) {
  return useQuery({
    queryKey: ['expenses', planId, 'range', startDate, endDate],
    queryFn: () =>
      getExpenseRepo().getByPlanIdAndDateRange(planId!, startDate, endDate),
    enabled: !!planId && !!startDate && !!endDate,
    staleTime: PLAN_DATA_STALE_TIME_MS,
  });
}

export function useTaxComponents(planId: string | undefined) {
  return useQuery({
    queryKey: ['tax-components', planId],
    queryFn: () => getTaxComponentRepo().getByPlanId(planId!),
    enabled: !!planId,
    staleTime: PLAN_DATA_STALE_TIME_MS,
  });
}

export function useGoals(planId: string | undefined) {
  return useQuery({
    queryKey: ['goals', planId],
    queryFn: () => getGoalRepo().getByPlanId(planId!),
    enabled: !!planId,
    staleTime: PLAN_DATA_STALE_TIME_MS,
  });
}

export function useAssets(planId: string | undefined) {
  return useQuery({
    queryKey: ['assets', planId],
    queryFn: () => getAssetRepo().getByPlanId(planId!),
    enabled: !!planId,
    staleTime: PLAN_DATA_STALE_TIME_MS,
  });
}

export function useLiabilities(planId: string | undefined) {
  return useQuery({
    queryKey: ['liabilities', planId],
    queryFn: () => getLiabilityRepo().getByPlanId(planId!),
    enabled: !!planId,
    staleTime: PLAN_DATA_STALE_TIME_MS,
  });
}

export function useNetWorthSnapshots(planId: string | undefined) {
  return useQuery({
    queryKey: ['net-worth-snapshots', planId],
    queryFn: () => getNetWorthSnapshotRepo().getByPlanId(planId!),
    enabled: !!planId,
    staleTime: PLAN_DATA_STALE_TIME_MS,
  });
}

export function useRecurringTemplates(planId: string | undefined) {
  return useQuery({
    queryKey: ['recurring-templates', planId],
    queryFn: () => getRecurringTemplateRepo().getByPlanId(planId!),
    enabled: !!planId,
    staleTime: PLAN_DATA_STALE_TIME_MS,
  });
}

export function useExpenseAttachments(expenseId: string | undefined) {
  return useQuery({
    queryKey: ['expense-attachments', expenseId],
    queryFn: () => getAttachmentRepo().getByExpenseId(expenseId!),
    enabled: !!expenseId,
    staleTime: PLAN_DATA_STALE_TIME_MS,
  });
}

export function useExchangeRates(planId: string | undefined) {
  return useQuery({
    queryKey: ['exchange-rates', planId],
    queryFn: () => getExchangeRateRepo().getByPlanId(planId!),
    enabled: !!planId,
    staleTime: PLAN_DATA_STALE_TIME_MS,
  });
}

export function useActiveRecurringTemplates(planId: string | undefined) {
  return useQuery({
    queryKey: ['recurring-templates-active', planId],
    queryFn: () => getRecurringTemplateRepo().getActiveByPlanId(planId!),
    enabled: !!planId,
    staleTime: PLAN_DATA_STALE_TIME_MS,
  });
}
