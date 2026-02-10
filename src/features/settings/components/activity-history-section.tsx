import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { History, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/feedback/empty-state';
import { useChangelog } from '@/hooks/use-changelog';
import type { ChangeLogEntry } from '@/domain/plan';

const ENTITY_LABELS: Record<ChangeLogEntry['entityType'], string> = {
  plan: 'Plan',
  expense: 'Expense',
  bucket: 'Bucket',
  tax_component: 'Tax Component',
  snapshot: 'Snapshot',
  goal: 'Goal',
  asset: 'Asset',
  liability: 'Liability',
  net_worth_snapshot: 'Net Worth Snapshot',
  recurring_template: 'Recurring Template',
};

const OPERATION_LABELS: Record<ChangeLogEntry['operation'], string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
};

const OPERATION_VARIANTS: Record<
  ChangeLogEntry['operation'],
  'default' | 'secondary' | 'destructive'
> = {
  create: 'default',
  update: 'secondary',
  delete: 'destructive',
};

const ENTITY_OPTIONS = [
  { value: 'all', label: 'All activity' },
  ...(
    Object.entries(ENTITY_LABELS) as [ChangeLogEntry['entityType'], string][]
  ).map(([value, label]) => ({ value, label })),
] as const;

export function ActivityHistorySection() {
  const [entityFilter, setEntityFilter] = useState<
    'all' | ChangeLogEntry['entityType']
  >('all');

  const filter = useMemo(() => {
    if (entityFilter === 'all') return undefined;
    return { entityType: entityFilter };
  }, [entityFilter]);

  const {
    entries,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useChangelog({ filter, pageSize: 15 });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-5" />
          Activity History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="text-muted-foreground size-4" aria-hidden="true" />
          <Select
            value={entityFilter}
            onValueChange={(val) =>
              setEntityFilter(val as 'all' | ChangeLogEntry['entityType'])
            }
          >
            <SelectTrigger
              className="h-8 w-[180px]"
              aria-label="Filter activity by type"
            >
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && Boolean(error) && (
          <EmptyState
            icon={History}
            title="Unable to load activity"
            description="Please try again in a moment."
          />
        )}

        {!isLoading && !error && entries.length === 0 && (
          <EmptyState
            icon={History}
            title="No activity yet"
            description="Changes you make across the app will appear here."
          />
        )}

        {!isLoading && !error && entries.length > 0 && (
          <ul className="space-y-3" role="list">
            {entries.map((entry) => {
              const name = getEntryName(entry.payload);
              const title = name
                ? `${OPERATION_LABELS[entry.operation]} ${ENTITY_LABELS[entry.entityType]}: ${name}`
                : `${OPERATION_LABELS[entry.operation]} ${ENTITY_LABELS[entry.entityType]}`;

              return (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={OPERATION_VARIANTS[entry.operation]}>
                        {OPERATION_LABELS[entry.operation]}
                      </Badge>
                      <span className="truncate text-sm font-medium">
                        {title}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      ID: {truncateId(entry.entityId)}
                    </p>
                  </div>
                  <time
                    className="text-muted-foreground text-xs"
                    dateTime={entry.timestamp}
                  >
                    {formatTimestamp(entry.timestamp)}
                  </time>
                </li>
              );
            })}
          </ul>
        )}

        {!isLoading && !error && hasNextPage && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? 'Loading…' : 'Load more'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getEntryName(payload?: string): string | null {
  if (!payload) return null;
  try {
    const parsed = JSON.parse(payload) as { name?: string };
    return parsed?.name ?? null;
  } catch {
    return null;
  }
}

function truncateId(id: string): string {
  if (id.length <= 10) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.valueOf())) return timestamp;
  return format(date, 'MMM d, yyyy h:mm a');
}
