import { lazy, Suspense, useMemo, useCallback } from 'react';
import { useQueryStates, parseAsString } from 'nuqs';
import { format, parseISO } from 'date-fns';
import { formatDisplayDate } from '@/features/expenses/utils/date-utils';
import { FileBarChart, Printer } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/feedback/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useActivePlan } from '@/hooks/use-active-plan';
import {
  useBuckets,
  useExpensesByDateRange,
  useTaxComponents,
} from '@/hooks/use-plan-data';
import { useExchangeRates } from '@/hooks/use-plan-data';
import { useSnapshots } from '@/hooks/use-snapshots';
import type { DateRange, DateRangePreset } from '../types';
import { useReportData } from '../hooks/use-report-data';
import { getDateRangeFromPreset } from '../utils/report-calculations';
import { DateRangeSelector } from '../components/date-range-selector';
import { ReportsSkeleton } from '../components/reports-skeleton';

const SpendingByCategoryReport = lazy(
  () => import('../components/spending-by-category-report'),
);
const IncomeVsExpensesReport = lazy(
  () => import('../components/income-vs-expenses-report'),
);
const BudgetAdherenceReport = lazy(
  () => import('../components/budget-adherence-report'),
);
const CategoryTrendsReport = lazy(
  () => import('../components/category-trends-report'),
);
const TopExpensesReport = lazy(
  () => import('../components/top-expenses-report'),
);

/**
 * Reports page with custom date ranges and multiple report types.
 *
 * Features:
 * - Date range presets (this month, last month, last 3/6 months, YTD, last year)
 * - Custom date range with calendar pickers
 * - URL-persisted state via nuqs for shareable links
 * - Five report types with charts and tables
 * - Export to CSV/PDF for each report
 * - Print-friendly layout
 */
export default function ReportsPage() {
  const { data: plan, isLoading: planLoading } = useActivePlan();

  // URL-based filter state
  const [filters, setFilters] = useQueryStates({
    preset: parseAsString.withDefault('last_3_months'),
    start: parseAsString.withDefault(''),
    end: parseAsString.withDefault(''),
    includeRollover: parseAsString.withDefault('true'),
  });

  const preset = filters.preset as DateRangePreset;
  const includeRollover = filters.includeRollover === 'true';

  // Calculate effective date range
  const dateRange = useMemo((): DateRange => {
    if (preset === 'custom' && filters.start && filters.end) {
      return {
        start: parseISO(filters.start),
        end: parseISO(filters.end),
      };
    }
    return getDateRangeFromPreset(preset);
  }, [preset, filters.start, filters.end]);

  // Format date range as ISO strings for scoped expense query
  const startDateISO = useMemo(
    () => format(dateRange.start, 'yyyy-MM-dd'),
    [dateRange.start],
  );
  const endDateISO = useMemo(
    () => format(dateRange.end, 'yyyy-MM-dd'),
    [dateRange.end],
  );

  // Fetch only expenses within the report date range
  const { data: expenses = [], isLoading: expensesLoading } =
    useExpensesByDateRange(plan?.id, startDateISO, endDateISO);
  const { data: buckets = [], isLoading: bucketsLoading } = useBuckets(
    plan?.id,
  );
  const { data: taxComponents = [], isLoading: taxLoading } = useTaxComponents(
    plan?.id,
  );
  const { data: snapshots = [], isLoading: snapshotsLoading } = useSnapshots(
    plan?.id,
  );
  const { data: exchangeRates, isLoading: exchangeRatesLoading } =
    useExchangeRates(plan?.id);

  // Compute all report data
  const reportData = useReportData({
    plan: plan ?? null,
    taxComponents,
    expenses,
    buckets,
    snapshots,
    exchangeRates: exchangeRates ?? undefined,
    includeRollover,
    dateRange,
  });

  // Handlers for date range changes
  const handlePresetChange = useCallback(
    (newPreset: DateRangePreset) => {
      void setFilters({ preset: newPreset });
    },
    [setFilters],
  );

  const handleCustomStartChange = useCallback(
    (date: string) => {
      void setFilters({ start: date });
    },
    [setFilters],
  );

  const handleCustomEndChange = useCallback(
    (date: string) => {
      void setFilters({ end: date });
    },
    [setFilters],
  );

  // Print handler
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const isLoading =
    planLoading ||
    expensesLoading ||
    bucketsLoading ||
    taxLoading ||
    snapshotsLoading ||
    exchangeRatesLoading;

  if (isLoading) {
    return <ReportsSkeleton />;
  }

  if (!plan) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Reports"
          description="Analyze your financial data with custom date ranges."
          eyebrow="Insights"
        />
        <EmptyState
          icon={FileBarChart}
          title="No Plan Found"
          description="Complete onboarding to access financial reports."
        />
      </div>
    );
  }

  const hasExpenses = expenses.length > 0;

  return (
    <div className="space-y-8 print:space-y-8">
      {/* Header */}
      <PageHeader
        title="Reports"
        description="Analyze your financial data with custom date ranges."
        eyebrow="Insights"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="print:hidden"
          >
            <Printer className="size-4" />
            Print
          </Button>
        }
      />

      {/* Date Range Selector */}
      <Card className="print:hidden">
        <CardContent className="pt-6">
          <DateRangeSelector
            preset={preset}
            customStart={filters.start}
            customEnd={filters.end}
            onPresetChange={handlePresetChange}
            onCustomStartChange={handleCustomStartChange}
            onCustomEndChange={handleCustomEndChange}
          />
          <div className="mt-4 flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="include-rollover" className="font-medium">
                Include rollover
              </Label>
              <p className="text-muted-foreground text-xs">
                Adds unused budget from the prior month to each bucket’s
                available amount.
              </p>
            </div>
            <Switch
              id="include-rollover"
              checked={includeRollover}
              onCheckedChange={(checked) => {
                void setFilters({
                  includeRollover: checked ? 'true' : 'false',
                });
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Print Header (only visible when printing) */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">Talliofi Financial Reports</h1>
        <p className="text-muted-foreground">
          Period: {formatDisplayDate(dateRange.start)} -{' '}
          {formatDisplayDate(dateRange.end)}
        </p>
        <p className="text-muted-foreground text-sm">
          Generated: {formatDisplayDate(new Date())}
        </p>
      </div>

      {/* No Data State */}
      {!hasExpenses && (
        <EmptyState
          icon={FileBarChart}
          title="No expense data"
          description="Add expenses to generate financial reports. Reports will show spending patterns, budget adherence, and trends."
        />
      )}

      {/* Reports Grid */}
      {hasExpenses && (
        <Suspense
          fallback={<Skeleton className="h-[300px] w-full rounded-xl" />}
        >
          {/* Row 1: Spending by Category + Budget Adherence */}
          <div className="grid gap-6 lg:grid-cols-2">
            <SpendingByCategoryReport report={reportData.spendingByCategory} />
            <BudgetAdherenceReport report={reportData.budgetAdherence} />
          </div>

          {/* Row 2: Income vs Expenses (full width) */}
          <IncomeVsExpensesReport report={reportData.incomeVsExpenses} />

          {/* Row 3: Category Trends (full width) */}
          <CategoryTrendsReport report={reportData.categoryTrends} />

          {/* Row 4: Top Expenses (full width) */}
          <TopExpensesReport report={reportData.topExpenses} />
        </Suspense>
      )}
    </div>
  );
}
