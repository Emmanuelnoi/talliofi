import { LayoutDashboard } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/feedback/empty-state';
import { useBuckets } from '@/hooks/use-plan-data';
import { usePlanSummary } from '../hooks/use-plan-summary';
import { DashboardSkeleton } from '../components/dashboard-skeleton';
import { IncomeSummaryCard } from '../components/income-summary-card';
import { BucketDonutChart } from '../components/bucket-donut-chart';
import { KeyNumbersGrid } from '../components/key-numbers-grid';
import { ExpenseTrendChart } from '../components/expense-trend-chart';
import { AlertsPanel } from '../components/alerts-panel';

export default function DashboardPage() {
  const { summary, plan, isLoading } = usePlanSummary();
  const { data: buckets = [], isLoading: bucketsLoading } = useBuckets(
    plan?.id,
  );

  if (isLoading || bucketsLoading) return <DashboardSkeleton />;

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
      <ExpenseTrendChart expensesByCategory={summary.expensesByCategory} />
      <AlertsPanel alerts={summary.alerts} />
    </div>
  );
}
