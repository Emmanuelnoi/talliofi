import { lazy, Suspense, useState } from 'react';
import { Clock } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/feedback/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useActivePlan } from '@/hooks/use-active-plan';
import { useSnapshots } from '@/hooks/use-snapshots';
import { useRollingAverages } from '../hooks/use-rolling-averages';
import { HistoryEmpty } from '../components/history-empty';
import { HistorySkeleton } from '../components/history-skeleton';
import { RollingAverageSummary } from '../components/rolling-average-summary';
import { SnapshotList } from '../components/snapshot-list';

const TrendChart = lazy(() => import('../components/trend-chart'));

type AveragePeriod = '3' | '6' | '12';

export default function HistoryPage() {
  const { data: plan, isLoading: planLoading } = useActivePlan();
  const {
    data: snapshots = [],
    isLoading: snapshotsLoading,
    isError: snapshotsError,
  } = useSnapshots(plan?.id);
  const [averagePeriod, setAveragePeriod] = useState<AveragePeriod>('3');

  const rollingAverages = useRollingAverages(
    snapshots,
    Number(averagePeriod) as 3 | 6 | 12,
  );

  if (planLoading || snapshotsLoading) {
    return <HistorySkeleton />;
  }

  if (snapshotsError) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="History"
          description="View your monthly snapshots and trends."
          eyebrow="Activity"
        />
        <EmptyState
          icon={Clock}
          title="Unable to Load History"
          description="There was a problem loading your snapshots. Please try again later."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="History"
        description="View your monthly snapshots and trends."
        eyebrow="Activity"
      />

      {snapshots.length === 0 ? (
        <HistoryEmpty />
      ) : (
        <>
          <div className="space-y-4">
            <Tabs
              value={averagePeriod}
              onValueChange={(value) =>
                setAveragePeriod(value as AveragePeriod)
              }
            >
              <TabsList>
                <TabsTrigger value="3">3 months</TabsTrigger>
                <TabsTrigger value="6">6 months</TabsTrigger>
                <TabsTrigger value="12">12 months</TabsTrigger>
              </TabsList>
            </Tabs>
            <RollingAverageSummary
              averages={rollingAverages}
              months={Number(averagePeriod) as 3 | 6 | 12}
            />
          </div>

          <Suspense
            fallback={<Skeleton className="h-[300px] w-full rounded-xl" />}
          >
            <TrendChart snapshots={snapshots} />
          </Suspense>

          <SnapshotList snapshots={snapshots} />
        </>
      )}
    </div>
  );
}
