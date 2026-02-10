import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { changelogRepo } from '@/data/repos/changelog-repo';
import type {
  ChangelogFilter,
  PaginatedChangelog,
} from '@/data/repos/changelog-repo';
import type { ChangeLogEntry } from '@/domain/plan';
import { useActivePlan } from '@/hooks/use-active-plan';
import { CHANGELOG_QUERY_KEY } from '@/hooks/use-plan-mutations';

const DEFAULT_PAGE_SIZE = 20;

export interface UseChangelogOptions {
  /** Optional filter for entity type or date range. */
  filter?: ChangelogFilter;
  /** Number of entries to fetch per page. */
  pageSize?: number;
  /** Whether the query is enabled. Defaults to true. */
  enabled?: boolean;
}

export interface UseChangelogResult {
  entries: ChangeLogEntry[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => Promise<void>;
  error: unknown;
}

/**
 * Fetches changelog entries for the active plan using infinite pagination.
 */
export function useChangelog(
  options: UseChangelogOptions = {},
): UseChangelogResult {
  const { data: plan } = useActivePlan();
  const planId = plan?.id ?? '';
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const enabled = options.enabled ?? true;
  const filter = options.filter;

  const queryKey = useMemo(() => {
    return [
      ...CHANGELOG_QUERY_KEY,
      planId,
      pageSize,
      filter?.entityType ?? 'all',
      filter?.startDate ?? '',
      filter?.endDate ?? '',
    ] as const;
  }, [
    planId,
    pageSize,
    filter?.entityType,
    filter?.startDate,
    filter?.endDate,
  ]);

  const query = useInfiniteQuery<PaginatedChangelog>({
    queryKey,
    enabled: enabled && Boolean(planId),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const offset = Number(pageParam) * pageSize;
      return changelogRepo.getByPlanIdPaginated(
        planId,
        pageSize,
        offset,
        filter,
      );
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length : undefined,
  });

  const entries = query.data?.pages
    ? query.data.pages.flatMap((page) => page.entries)
    : [];

  return {
    entries,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: Boolean(query.hasNextPage),
    fetchNextPage: async () => {
      await query.fetchNextPage();
    },
    error: query.error,
  };
}
