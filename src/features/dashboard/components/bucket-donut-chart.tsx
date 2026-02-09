import { useMemo } from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import type { BucketAnalysis, BucketAllocation } from '@/domain/plan';
import { formatMoney } from '@/domain/money';
import { centsToDollars } from '@/domain/money';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from '@/components/ui/chart';
import { EmptyState } from '@/components/feedback/empty-state';
import { ChartDataTable } from '@/components/accessibility';

interface BucketDonutChartProps {
  bucketAnalysis: readonly BucketAnalysis[];
  buckets: readonly BucketAllocation[];
}

interface ChartDatum {
  bucketId: string;
  name: string;
  value: number;
  fill: string;
  actualFormatted: string;
  targetFormatted: string;
}

/** Fallback colors when a bucket has no .color set */
const FALLBACK_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
];

export function BucketDonutChart({
  bucketAnalysis,
  buckets,
}: BucketDonutChartProps) {
  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const bucket of buckets) {
      map.set(bucket.id, bucket.color);
    }
    return map;
  }, [buckets]);

  const data: ChartDatum[] = useMemo(
    () =>
      bucketAnalysis.map((ba, index) => ({
        bucketId: ba.bucketId,
        name: ba.bucketName,
        value: centsToDollars(ba.actualAmountCents),
        fill:
          colorMap.get(ba.bucketId) ??
          FALLBACK_COLORS[index % FALLBACK_COLORS.length],
        actualFormatted: formatMoney(ba.actualAmountCents),
        targetFormatted: formatMoney(ba.targetAmountCents),
      })),
    [bucketAnalysis, colorMap],
  );

  const chartConfig: ChartConfig = useMemo(() => {
    const config: ChartConfig = {};
    for (const datum of data) {
      config[datum.name] = {
        label: datum.name,
        color: datum.fill,
      };
    }
    return config;
  }, [data]);

  if (bucketAnalysis.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bucket Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={PieChartIcon}
            title="No buckets yet"
            description="Create buckets to see how your spending is allocated."
          />
        </CardContent>
      </Card>
    );
  }

  const ariaLabel = `Bucket allocation donut chart showing ${data.length} buckets: ${data.map((d) => `${d.name} ${d.actualFormatted}`).join(', ')}`;

  // Data for accessible table alternative
  const tableData = useMemo(
    () =>
      data.map((d) => ({
        label: d.name,
        value: d.actualFormatted,
        secondaryValue: d.targetFormatted,
      })),
    [data],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bucket Allocation</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square"
          role="img"
          aria-label={ariaLabel}
        >
          <PieChart>
            <ChartTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const datum = payload[0].payload as ChartDatum;
                return (
                  <div className="bg-background border-border/50 rounded-lg border px-3 py-2 text-xs shadow-xl">
                    <p className="mb-1 font-medium">{datum.name}</p>
                    <p className="text-muted-foreground">
                      Actual: {datum.actualFormatted}
                    </p>
                    <p className="text-muted-foreground">
                      Target: {datum.targetFormatted}
                    </p>
                  </div>
                );
              }}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              strokeWidth={2}
            >
              {data.map((entry) => (
                <Cell key={entry.bucketId} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>

        {/* Screen-reader data summary */}
        <div className="sr-only">
          <ul>
            {data.map((d) => (
              <li key={d.bucketId}>
                {d.name}: actual {d.actualFormatted}, target {d.targetFormatted}
              </li>
            ))}
          </ul>
        </div>

        {/* Visible legend */}
        <ul className="mt-4 grid gap-2" aria-label="Bucket legend">
          {data.map((d) => (
            <li key={d.bucketId} className="flex items-center gap-2 text-sm">
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: d.fill }}
                aria-hidden="true"
              />
              <span className="flex-1 truncate">{d.name}</span>
              <span className="text-muted-foreground tabular-nums">
                {d.actualFormatted}
                <span className="mx-1" aria-hidden="true">/</span>
                <span className="sr-only">target</span>
                {d.targetFormatted}
              </span>
            </li>
          ))}
        </ul>

        {/* Accessible data table alternative */}
        <ChartDataTable
          title="Bucket Allocation Data"
          labelHeader="Bucket"
          valueHeader="Actual"
          secondaryValueHeader="Target"
          data={tableData}
        />
      </CardContent>
    </Card>
  );
}
