import { useMemo, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { CategoricalChartFunc } from 'recharts/types/chart/types';
import type { MonthlySnapshot } from '@/domain/plan/types';
import { centsToDollars, formatMoney } from '@/domain/money';
import type { Cents } from '@/domain/money';
import { useCurrencyStore } from '@/stores/currency-store';
import { formatMonthOnly } from '@/features/expenses/utils/date-utils';
import { EmptyState } from '@/components/feedback/empty-state';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartDataTable } from '@/components/accessibility';
import { TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router';
import { format } from 'date-fns';

interface TrendChartProps {
  snapshots: MonthlySnapshot[];
}

const chartConfig = {
  netIncome: {
    label: 'Net Income',
    color: 'var(--surplus)',
  },
  expenses: {
    label: 'Expenses',
    color: 'var(--deficit)',
  },
} satisfies ChartConfig;

/** Formats a yearMonth string (e.g. "2026-01") into a short label. */
const formatShortMonth = formatMonthOnly;

export function TrendChart({ snapshots }: TrendChartProps) {
  const navigate = useNavigate();
  const currencyCode = useCurrencyStore((s) => s.currencyCode);
  const chartData = useMemo(() => {
    const sorted = [...snapshots].sort((a, b) =>
      a.yearMonth.localeCompare(b.yearMonth),
    );

    return sorted.map((s) => ({
      month: formatShortMonth(s.yearMonth),
      yearMonth: s.yearMonth,
      netIncome: centsToDollars(s.netIncomeCents),
      expenses: centsToDollars(s.totalExpensesCents),
      netIncomeFormatted: formatMoney(s.netIncomeCents, {
        currency: currencyCode,
      }),
      expensesFormatted: formatMoney(s.totalExpensesCents, {
        currency: currencyCode,
      }),
    }));
  }, [snapshots, currencyCode]);

  const handleMonthClick = useCallback(
    (yearMonth?: string) => {
      if (!yearMonth) return;
      const [year, month] = yearMonth.split('-').map(Number);
      if (!year || !month) return;
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      const dateFrom = format(start, 'yyyy-MM-dd');
      const dateTo = format(end, 'yyyy-MM-dd');
      void navigate(`/expenses?dateFrom=${dateFrom}&dateTo=${dateTo}`);
    },
    [navigate],
  );

  const handleChartClick = useCallback<CategoricalChartFunc>(
    (state) => {
      const index =
        typeof state?.activeTooltipIndex === 'number'
          ? state.activeTooltipIndex
          : -1;
      const yearMonth = index >= 0 ? chartData[index]?.yearMonth : undefined;
      handleMonthClick(yearMonth);
    },
    [handleMonthClick, chartData],
  );

  // Generate accessible description for screen readers
  const accessibleDescription = useMemo(() => {
    if (chartData.length === 0) return '';
    const dataPoints = chartData.map(
      (d) =>
        `${d.month}: net income ${d.netIncomeFormatted}, expenses ${d.expensesFormatted}`,
    );
    return `Monthly income vs expenses trend chart showing ${chartData.length} months. ${dataPoints.join('. ')}.`;
  }, [chartData]);

  // Data for accessible table alternative
  const tableData = useMemo(
    () =>
      chartData.map((d) => ({
        label: d.month,
        value: d.netIncomeFormatted,
        secondaryValue: d.expensesFormatted,
      })),
    [chartData],
  );

  if (snapshots.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Income vs. Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={TrendingUp}
            title="Not enough data"
            description="At least 2 months of snapshots are needed to display the trend chart."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income vs. Expenses</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="h-[300px] w-full"
          role="img"
          aria-label={accessibleDescription}
        >
          <LineChart
            data={chartData}
            accessibilityLayer
            onClick={handleChartClick}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) =>
                formatMoney(Math.round(value * 100) as Cents, {
                  currency: currencyCode,
                })
              }
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => {
                    const dollars =
                      typeof value === 'number' ? value : Number(value);
                    return formatMoney(Math.round(dollars * 100) as Cents, {
                      currency: currencyCode,
                    });
                  }}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="netIncome"
              stroke="var(--color-netIncome)"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="expenses"
              stroke="var(--color-expenses)"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ChartContainer>

        {/* Accessible data table alternative */}
        <ChartDataTable
          title="Income vs. Expenses Trend Data"
          labelHeader="Month"
          valueHeader="Net Income"
          secondaryValueHeader="Expenses"
          data={tableData}
        />
      </CardContent>
    </Card>
  );
}
