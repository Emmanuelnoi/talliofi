import { LayoutDashboard } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/feedback/empty-state';
import { useBuckets, useAssets, useLiabilities } from '@/hooks/use-plan-data';
import { usePlanSummary } from '../hooks/use-plan-summary';
import { DashboardSkeleton } from '../components/dashboard-skeleton';
import { IncomeSummaryCard } from '../components/income-summary-card';
import { BucketDonutChart } from '../components/bucket-donut-chart';
import { KeyNumbersGrid } from '../components/key-numbers-grid';
import { ExpenseTrendChart } from '../components/expense-trend-chart';
import { AlertsPanel } from '../components/alerts-panel';
import { NetWorthCard } from '../components/net-worth-card';
import { useNetWorthSummary } from '@/features/net-worth/hooks/use-net-worth';

export default function DashboardPage() {
  const { summary, plan, isLoading } = usePlanSummary();
  const { data: buckets = [], isLoading: bucketsLoading } = useBuckets(
    plan?.id,
  );
  const { data: assets = [], isLoading: assetsLoading } = useAssets(plan?.id);
  const { data: liabilities = [], isLoading: liabilitiesLoading } =
    useLiabilities(plan?.id);

  const netWorthSummary = useNetWorthSummary(assets, liabilities);

  if (isLoading || bucketsLoading || assetsLoading || liabilitiesLoading)
    return <DashboardSkeleton />;

  if (!plan || !summary) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description="Overview of your financial plan."
        />
        <EmptyState
          icon={LayoutDashboard}
          title="No plan yet"
          description="Complete onboarding to see your financial overview."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your financial plan."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <IncomeSummaryCard summary={summary} className="lg:col-span-2" />
        <BucketDonutChart
          bucketAnalysis={summary.bucketAnalysis}
          buckets={buckets}
        />
      </div>
      <KeyNumbersGrid summary={summary} />
      <NetWorthCard
        totalAssets={netWorthSummary.totalAssets}
        totalLiabilities={netWorthSummary.totalLiabilities}
        netWorth={netWorthSummary.netWorth}
      />
      <ExpenseTrendChart expensesByCategory={summary.expensesByCategory} />
      <AlertsPanel alerts={summary.alerts} />
    </div>
  );
}
