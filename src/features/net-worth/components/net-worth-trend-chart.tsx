import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { NetWorthSnapshot } from '@/domain/plan/types';
import { centsToDollars, formatMoney } from '@/domain/money';
import type { Cents } from '@/domain/money';
import { useCurrencyStore } from '@/stores/currency-store';
import { EmptyState } from '@/components/feedback/empty-state';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartDataTable } from '@/components/accessibility';
import { formatShortMonth } from '@/features/expenses/utils/date-utils';

interface NetWorthTrendChartProps {
  snapshots: NetWorthSnapshot[];
}

const chartConfig = {
  netWorth: {
    label: 'Net Worth',
    color: 'var(--color-chart-1)',
  },
  assets: {
    label: 'Assets',
    color: 'var(--surplus)',
  },
  liabilities: {
    label: 'Liabilities',
    color: 'var(--deficit)',
  },
} satisfies ChartConfig;

export function NetWorthTrendChart({ snapshots }: NetWorthTrendChartProps) {
  const currencyCode = useCurrencyStore((s) => s.currencyCode);
  const chartData = useMemo(() => {
    const sorted = [...snapshots].sort((a, b) =>
      a.yearMonth.localeCompare(b.yearMonth),
    );

    return sorted.map((s) => ({
      month: formatShortMonth(s.yearMonth),
      netWorth: centsToDollars(s.netWorthCents),
      assets: centsToDollars(s.totalAssetsCents),
      liabilities: centsToDollars(s.totalLiabilitiesCents),
      netWorthFormatted: formatMoney(s.netWorthCents, {
        currency: currencyCode,
      }),
      assetsFormatted: formatMoney(s.totalAssetsCents, {
        currency: currencyCode,
      }),
      liabilitiesFormatted: formatMoney(s.totalLiabilitiesCents, {
        currency: currencyCode,
      }),
    }));
  }, [snapshots, currencyCode]);

  // Data for accessible table alternative
  const tableData = useMemo(
    () =>
      chartData.map((d) => ({
        label: d.month,
        value: d.netWorthFormatted,
        secondaryValue: `Assets: ${d.assetsFormatted}, Liabilities: ${d.liabilitiesFormatted}`,
      })),
    [chartData],
  );

  // Generate accessible description
  const accessibleDescription = useMemo(() => {
    if (chartData.length === 0) return '';
    return `Net worth trend chart showing ${chartData.length} months. ${chartData.map((d) => `${d.month}: ${d.netWorthFormatted}`).join(', ')}.`;
  }, [chartData]);

  if (snapshots.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Net Worth Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={TrendingUp}
            title="Not enough data"
            description="Net worth snapshots are saved monthly. At least 2 months of data are needed to display the trend chart."
          />
        </CardContent>
      </Card>
    );
  }

  // Calculate change from first to last snapshot
  const firstSnapshot = snapshots[0];
  const lastSnapshot = snapshots[snapshots.length - 1];
  const netWorthChange =
    lastSnapshot.netWorthCents - firstSnapshot.netWorthCents;
  const isPositiveChange = netWorthChange > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Net Worth Trend</CardTitle>
          {snapshots.length >= 2 && (
            <div
              className={`text-sm font-medium ${
                isPositiveChange
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {isPositiveChange ? '+' : ''}
              {formatMoney(netWorthChange as Cents, {
                currency: currencyCode,
              })}
            </div>
          )}
        </div>
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
              dataKey="netWorth"
              stroke="var(--color-netWorth)"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="assets"
              stroke="var(--color-assets)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="liabilities"
              stroke="var(--color-liabilities)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ChartContainer>

        {/* Accessible data table alternative */}
        <ChartDataTable
          title="Net Worth Trend Data"
          labelHeader="Month"
          valueHeader="Net Worth"
          secondaryValueHeader="Details"
          data={tableData}
        />
      </CardContent>
    </Card>
  );
}
