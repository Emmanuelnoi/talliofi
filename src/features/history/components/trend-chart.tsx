import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { MonthlySnapshot } from '@/domain/plan/types';
import { centsToDollars, formatMoney } from '@/domain/money';
import type { Cents } from '@/domain/money';
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
function formatShortMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short' });
}

export function TrendChart({ snapshots }: TrendChartProps) {
  const chartData = useMemo(() => {
    const sorted = [...snapshots].sort((a, b) =>
      a.yearMonth.localeCompare(b.yearMonth),
    );

    return sorted.map((s) => ({
      month: formatShortMonth(s.yearMonth),
      netIncome: centsToDollars(s.netIncomeCents),
      expenses: centsToDollars(s.totalExpensesCents),
      netIncomeFormatted: formatMoney(s.netIncomeCents),
      expensesFormatted: formatMoney(s.totalExpensesCents),
    }));
  }, [snapshots]);

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
          <LineChart data={chartData} accessibilityLayer>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) =>
                formatMoney(Math.round(value * 100) as Cents)
              }
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => {
                    const dollars =
                      typeof value === 'number' ? value : Number(value);
                    return formatMoney(Math.round(dollars * 100) as Cents);
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
