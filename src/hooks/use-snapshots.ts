import { useQuery } from '@tanstack/react-query';
import { snapshotRepo } from '@/data/repos/snapshot-repo';
import { PLAN_DATA_STALE_TIME_MS } from '@/lib/constants';
import { queryKeys } from './query-keys';

export function useSnapshots(planId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.snapshots(planId),
    queryFn: () => snapshotRepo.getByPlanId(planId!),
    enabled: !!planId,
    staleTime: PLAN_DATA_STALE_TIME_MS,
  });
}
