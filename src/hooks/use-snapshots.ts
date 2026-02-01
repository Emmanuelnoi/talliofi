import { useQuery } from '@tanstack/react-query';
import { snapshotRepo } from '@/data/repos/snapshot-repo';

export const SNAPSHOTS_QUERY_KEY = (planId: string | undefined) =>
  ['snapshots', planId] as const;

export function useSnapshots(planId: string | undefined) {
  return useQuery({
    queryKey: SNAPSHOTS_QUERY_KEY(planId),
    queryFn: () => snapshotRepo.getByPlanId(planId!),
    enabled: !!planId,
    staleTime: 5 * 60 * 1000,
  });
}
