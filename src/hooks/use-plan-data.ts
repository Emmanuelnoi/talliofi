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
import { queryKeys } from './query-keys';

export function useBuckets(planId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.buckets(planId!),
    queryFn: () => getBucketRepo().getByPlanId(planId!),
    enabled: !!planId,
    staleTime: PLAN_DATA_STALE_TIME_MS,
  });
}

export function useExpenses(planId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.expenses(planId!),
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
    queryKey: queryKeys.expensesRange(planId!, startDate, endDate),
    queryFn: () =>
      getExpenseRepo().getByPlanIdAndDateRange(planId!, startDate, endDate),
    enabled: !!planId && !!startDate && !!endDate,
    staleTime: PLAN_DATA_STALE_TIME_MS,
  });
}

export function useTaxComponents(planId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.taxComponents(planId!),
    queryFn: () => getTaxComponentRepo().getByPlanId(planId!),
    enabled: !!planId,
    staleTime: PLAN_DATA_STALE_TIME_MS,
  });
}

export function useGoals(planId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.goals(planId!),
    queryFn: () => getGoalRepo().getByPlanId(planId!),
    enabled: !!planId,
    staleTime: PLAN_DATA_STALE_TIME_MS,
  });
}

export function useAssets(planId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.assets(planId!),
    queryFn: () => getAssetRepo().getByPlanId(planId!),
    enabled: !!planId,
    staleTime: PLAN_DATA_STALE_TIME_MS,
  });
}

export function useLiabilities(planId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.liabilities(planId!),
    queryFn: () => getLiabilityRepo().getByPlanId(planId!),
    enabled: !!planId,
    staleTime: PLAN_DATA_STALE_TIME_MS,
  });
}

export function useNetWorthSnapshots(planId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.netWorthSnapshots(planId!),
    queryFn: () => getNetWorthSnapshotRepo().getByPlanId(planId!),
    enabled: !!planId,
    staleTime: PLAN_DATA_STALE_TIME_MS,
  });
}

export function useRecurringTemplates(planId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.recurringTemplates(planId!),
    queryFn: () => getRecurringTemplateRepo().getByPlanId(planId!),
    enabled: !!planId,
    staleTime: PLAN_DATA_STALE_TIME_MS,
  });
}

export function useExpenseAttachments(expenseId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.expenseAttachments(expenseId!),
    queryFn: () => getAttachmentRepo().getByExpenseId(expenseId!),
    enabled: !!expenseId,
    staleTime: PLAN_DATA_STALE_TIME_MS,
  });
}

export function useExchangeRates(planId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.exchangeRates(planId!),
    queryFn: () => getExchangeRateRepo().getByPlanId(planId!),
    enabled: !!planId,
    staleTime: PLAN_DATA_STALE_TIME_MS,
  });
}

export function useActiveRecurringTemplates(planId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.recurringTemplatesActive(planId!),
    queryFn: () => getRecurringTemplateRepo().getActiveByPlanId(planId!),
    enabled: !!planId,
    staleTime: PLAN_DATA_STALE_TIME_MS,
  });
}
