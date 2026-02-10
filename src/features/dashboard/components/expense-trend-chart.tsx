import { useCallback, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Receipt } from 'lucide-react';
import { useNavigate } from 'react-router';
import type { ExpenseCategory } from '@/domain/plan';
import type { Cents } from '@/domain/money';
import { centsToDollars, formatMoney } from '@/domain/money';
import { useCurrencyStore } from '@/stores/currency-store';
import { CATEGORY_LABELS } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from '@/components/ui/chart';
import { EmptyState } from '@/components/feedback/empty-state';
import { ChartDataTable } from '@/components/accessibility';

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
  const navigate = useNavigate();
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

  /** Navigate to expenses page filtered by the clicked category. */
  const handleBarClick = useCallback(
    (datum: CategoryDatum) => {
      void navigate(
        `/expenses?categories=${encodeURIComponent(datum.category)}`,
      );
    },
    [navigate],
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
        <CardHeader>
          <CardTitle>Spending by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Receipt}
            title="No expenses tracked yet"
            description="Add expenses to see a breakdown by category."
            action={{
              label: 'Go to Expenses',
              onClick: () => void navigate('/expenses'),
            }}
          />
        </CardContent>
      </Card>
    );
  }

  const ariaLabel = `Spending by category bar chart: ${data.map((d) => `${d.label} ${d.formatted}`).join(', ')}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending by Category</CardTitle>
      </CardHeader>
      <CardContent>
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
                  <div className="bg-background border-border/50 rounded-lg border px-3 py-2 text-xs shadow-xl">
                    <p className="mb-1 font-medium">{datum.label}</p>
                    <p className="text-muted-foreground">{datum.formatted}</p>
                    <p className="text-muted-foreground mt-1 italic">
                      Click to view expenses
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
              className="cursor-pointer"
              onClick={(_: unknown, index: number) => {
                const datum = data[index];
                if (datum) handleBarClick(datum);
              }}
            />
          </BarChart>
        </ChartContainer>

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
