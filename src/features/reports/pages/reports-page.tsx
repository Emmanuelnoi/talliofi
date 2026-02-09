import { useMemo, useCallback } from 'react';
import { useQueryStates, parseAsString } from 'nuqs';
import { parseISO } from 'date-fns';
import { FileBarChart, Printer } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/feedback/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useActivePlan } from '@/hooks/use-active-plan';
import { useBuckets, useExpenses, useTaxComponents } from '@/hooks/use-plan-data';
import type { DateRange, DateRangePreset } from '../types';
import { useReportData } from '../hooks/use-report-data';
import { getDateRangeFromPreset } from '../utils/report-calculations';
import { DateRangeSelector } from '../components/date-range-selector';
import { ReportsSkeleton } from '../components/reports-skeleton';
import { SpendingByCategoryReport } from '../components/spending-by-category-report';
import { IncomeVsExpensesReport } from '../components/income-vs-expenses-report';
import { BudgetAdherenceReport } from '../components/budget-adherence-report';
import { CategoryTrendsReport } from '../components/category-trends-report';
import { TopExpensesReport } from '../components/top-expenses-report';

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
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses(
    plan?.id,
  );
  const { data: buckets = [], isLoading: bucketsLoading } = useBuckets(plan?.id);
  const { data: taxComponents = [], isLoading: taxLoading } = useTaxComponents(
    plan?.id,
  );

  // URL-based filter state
  const [filters, setFilters] = useQueryStates({
    preset: parseAsString.withDefault('last_3_months'),
    start: parseAsString.withDefault(''),
    end: parseAsString.withDefault(''),
  });

  const preset = filters.preset as DateRangePreset;

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

  // Compute all report data
  const reportData = useReportData({
    plan: plan ?? null,
    taxComponents,
    expenses,
    buckets,
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
    planLoading || expensesLoading || bucketsLoading || taxLoading;

  if (isLoading) {
    return <ReportsSkeleton />;
  }

  if (!plan) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Reports"
          description="Analyze your financial data with custom date ranges."
        />
        <EmptyState
          icon={FileBarChart}
          title="No plan found"
          description="Complete onboarding to access financial reports."
        />
      </div>
    );
  }

  const hasExpenses = expenses.length > 0;

  return (
    <div className="space-y-6 print:space-y-8">
      {/* Header */}
      <PageHeader
        title="Reports"
        description="Analyze your financial data with custom date ranges."
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
        </CardContent>
      </Card>

      {/* Print Header (only visible when printing) */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">Talliofi Financial Reports</h1>
        <p className="text-muted-foreground">
          Period: {dateRange.start.toLocaleDateString()} -{' '}
          {dateRange.end.toLocaleDateString()}
        </p>
        <p className="text-muted-foreground text-sm">
          Generated: {new Date().toLocaleDateString()}
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
        <>
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
        </>
      )}
    </div>
  );
}
