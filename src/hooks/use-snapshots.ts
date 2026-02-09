import { useQuery } from '@tanstack/react-query';
import { snapshotRepo } from '@/data/repos/snapshot-repo';
import { PLAN_DATA_STALE_TIME_MS } from '@/lib/constants';

export const SNAPSHOTS_QUERY_KEY = (planId: string | undefined) =>
  ['snapshots', planId] as const;

export function useSnapshots(planId: string | undefined) {
  return useQuery({
    queryKey: SNAPSHOTS_QUERY_KEY(planId),
    queryFn: () => snapshotRepo.getByPlanId(planId!),
    enabled: !!planId,
    staleTime: PLAN_DATA_STALE_TIME_MS,
  });
}
