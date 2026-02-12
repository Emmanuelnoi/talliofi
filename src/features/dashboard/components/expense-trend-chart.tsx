import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Receipt } from 'lucide-react';
import { Link } from 'react-router';
import type { ExpenseCategory } from '@/domain/plan';
import type { Cents } from '@/domain/money';
import { centsToDollars, formatMoney } from '@/domain/money';
import { useCurrencyStore } from '@/stores/currency-store';
import { CATEGORY_LABELS } from '@/lib/constants';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from '@/components/ui/chart';
import { EmptyState } from '@/components/feedback/empty-state';
import { ChartDataTable } from '@/components/accessibility';
import { Button } from '@/components/ui/button';

interface ExpenseTrendChartProps {
  expensesByCategory: ReadonlyMap<ExpenseCategory, Cents>;
}

interface CategoryDatum {
  category: string;
  label: string;
  value: number;
  formatted: string;
}

const CHART_COLOR = 'var(--color-chart-1)';

/** Static config -- no reactive dependencies, so kept at module level. */
const CHART_CONFIG: ChartConfig = {
  value: {
    label: 'Amount',
    color: CHART_COLOR,
  },
};

export function ExpenseTrendChart({
  expensesByCategory,
}: ExpenseTrendChartProps) {
  const currencyCode = useCurrencyStore((s) => s.currencyCode);

  const data: CategoryDatum[] = useMemo(
    () =>
      Array.from(expensesByCategory.entries())
        .map(([category, amount]) => ({
          category,
          label: CATEGORY_LABELS[category],
          value: centsToDollars(amount),
          formatted: formatMoney(amount, { currency: currencyCode }),
        }))
        .sort((a, b) => b.value - a.value),
    [expensesByCategory, currencyCode],
  );

  // Data for accessible table alternative
  const tableData = useMemo(
    () =>
      data.map((d) => ({
        label: d.label,
        value: d.formatted,
      })),
    [data],
  );

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 space-y-2">
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>
              Highest monthly expenses across your categories.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/expenses">View Expenses</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Receipt}
            title="No expenses tracked yet"
            description="Add expenses to see a breakdown by category."
          />
        </CardContent>
      </Card>
    );
  }

  const ariaLabel = `Spending by category bar chart: ${data.map((d) => `${d.label} ${d.formatted}`).join(', ')}`;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-2">
          <CardTitle>Spending by Category</CardTitle>
          <CardDescription>
            Highest monthly expenses across your categories.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/expenses">View Expenses</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <ChartContainer
          config={CHART_CONFIG}
          className="aspect-auto"
          style={{ height: `${Math.max(data.length * 40, 120)}px` }}
          role="img"
          aria-label={ariaLabel}
        >
          <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              tickLine={false}
              axisLine={false}
              width={75}
            />
            <ChartTooltip
              cursor={false}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const datum = payload[0].payload as CategoryDatum;
                return (
                  <div className="border-border/60 bg-card/95 text-foreground/90 rounded-lg border px-3 py-2 text-[11px] shadow-xl backdrop-blur">
                    <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.2em]">
                      {datum.label}
                    </p>
                    <p className="text-sm font-semibold tabular-nums">
                      {datum.formatted}
                    </p>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="value"
              fill={CHART_COLOR}
              radius={[0, 4, 4, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ChartContainer>

        <div className="flex flex-wrap gap-2">
          {data.map((datum) => (
            <Button
              key={datum.category}
              variant="outline"
              className="h-8 gap-2 px-3 text-xs font-semibold tracking-tight"
              asChild
            >
              <Link
                to={`/expenses?categories=${encodeURIComponent(datum.category)}`}
                aria-label={`View ${datum.label} expenses`}
              >
                <span className="truncate">{datum.label}</span>
                <span className="text-muted-foreground tabular-nums">
                  {datum.formatted}
                </span>
              </Link>
            </Button>
          ))}
        </div>

        {/* Screen-reader data summary */}
        <div className="sr-only">
          <ul>
            {data.map((d) => (
              <li key={d.category}>
                {d.label}: {d.formatted}
              </li>
            ))}
          </ul>
        </div>

        {/* Accessible data table alternative */}
        <ChartDataTable
          title="Spending by Category Data"
          labelHeader="Category"
          valueHeader="Amount"
          data={tableData}
        />
      </CardContent>
    </Card>
  );
}
