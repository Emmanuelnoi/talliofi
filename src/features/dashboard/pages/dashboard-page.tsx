import { lazy, Suspense, useMemo } from 'react';
import { LayoutDashboard } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/feedback/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useAssets, useLiabilities } from '@/hooks/use-plan-data';
import { usePlanSummary } from '../hooks/use-plan-summary';
import { DashboardSkeleton } from '../components/dashboard-skeleton';
import { IncomeSummaryCard } from '../components/income-summary-card';
import { KeyNumbersGrid } from '../components/key-numbers-grid';
import { AlertsPanel } from '../components/alerts-panel';
import { NetWorthCard } from '../components/net-worth-card';
import { useNetWorthSummary } from '@/features/net-worth/hooks/use-net-worth';
import { CATEGORY_LABELS } from '@/lib/constants';

const ExpenseDonutChart = lazy(
  () => import('@/components/charts/ExpenseDonutChart'),
);
const ExpenseTrendChart = lazy(
  () => import('../components/expense-trend-chart'),
);

export default function DashboardPage() {
  const { summary, plan, isLoading } = usePlanSummary();
  const { data: assets = [], isLoading: assetsLoading } = useAssets(plan?.id);
  const { data: liabilities = [], isLoading: liabilitiesLoading } =
    useLiabilities(plan?.id);

  const netWorthSummary = useNetWorthSummary(assets, liabilities);
  const expenseCategoryData = useMemo(() => {
    if (!summary) return [];
    return Array.from(summary.expensesByCategory.entries()).map(
      ([category, amount]) => ({
        category,
        label: CATEGORY_LABELS[category],
        valueCents: amount,
      }),
    );
  }, [summary]);

  if (isLoading || assetsLoading || liabilitiesLoading)
    return <DashboardSkeleton />;

  if (!plan || !summary) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Dashboard"
          description="Overview of your financial plan."
          eyebrow="Overview"
        />
        <EmptyState
          icon={LayoutDashboard}
          title="No Plan Yet"
          description="Complete onboarding to see your financial overview."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Overview of your financial plan."
        eyebrow="Overview"
      />
      <div className="grid gap-6 xl:grid-cols-12">
        <IncomeSummaryCard summary={summary} className="xl:col-span-7" />
        <Suspense
          fallback={<Skeleton className="h-[300px] w-full rounded-xl" />}
        >
          <ExpenseDonutChart
            data={expenseCategoryData}
            className="xl:col-span-5"
          />
        </Suspense>
      </div>
      <KeyNumbersGrid summary={summary} />
      <Suspense fallback={<Skeleton className="h-[300px] w-full rounded-xl" />}>
        <ExpenseTrendChart expensesByCategory={summary.expensesByCategory} />
      </Suspense>
      <div className="grid gap-6 lg:grid-cols-2">
        <NetWorthCard
          totalAssets={netWorthSummary.totalAssets}
          totalLiabilities={netWorthSummary.totalLiabilities}
          netWorth={netWorthSummary.netWorth}
        />
        <AlertsPanel alerts={summary.alerts} />
      </div>
    </div>
  );
}
