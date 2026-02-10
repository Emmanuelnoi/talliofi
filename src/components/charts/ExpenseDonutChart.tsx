import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import type { Cents } from '@/domain/money';
import { centsToDollars, formatMoney } from '@/domain/money';
import { useCurrencyStore } from '@/stores/currency-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartTooltip } from '@/components/ui/chart';
import { EmptyState } from '@/components/feedback/empty-state';
import { cn } from '@/lib/utils';

const START_ANGLE = 90;
const END_ANGLE = -270;
const MIN_LABEL_SPACING = 18;

const COLOR_PALETTE = [
  'var(--donut-1)',
  'var(--donut-2)',
  'var(--donut-3)',
  'var(--donut-4)',
  'var(--donut-5)',
  'var(--donut-6)',
  'var(--donut-7)',
];
const MAX_LABEL_LENGTH = 18;

interface ExpenseDonutDatum {
  category: string;
  label: string;
  valueCents: Cents;
  color?: string;
}

interface ExpenseDonutChartProps {
  data: readonly ExpenseDonutDatum[];
  title?: string;
  subtitle?: string;
  className?: string;
}

type LabelLayout = {
  index: number;
  lineStartX: number;
  lineStartY: number;
  lineBreakX: number;
  lineBreakY: number;
  lineEndX: number;
  lineEndY: number;
  textX: number;
  textY: number;
  textAnchor: 'start' | 'end';
  side: 'left' | 'right';
};

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;
    const element = ref.current;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, size };
}

function adjustLabelPositions(
  items: Array<{
    index: number;
    rawY: number;
    lineStartX: number;
    lineStartY: number;
    lineBreakX: number;
    lineBreakY: number;
    side: 'left' | 'right';
  }>,
  minY: number,
  maxY: number,
) {
  const sorted = [...items].sort((a, b) => a.rawY - b.rawY);
  const adjusted = sorted.map((item) => ({ ...item, adjustedY: item.rawY }));

  for (let i = 1; i < adjusted.length; i += 1) {
    const prev = adjusted[i - 1];
    const current = adjusted[i];
    if (current.adjustedY - prev.adjustedY < MIN_LABEL_SPACING) {
      current.adjustedY = prev.adjustedY + MIN_LABEL_SPACING;
    }
  }

  const last = adjusted[adjusted.length - 1];
  if (last && last.adjustedY > maxY) {
    const shift = last.adjustedY - maxY;
    adjusted.forEach((item) => {
      item.adjustedY -= shift;
    });
  }

  const first = adjusted[0];
  if (first && first.adjustedY < minY) {
    const shift = minY - first.adjustedY;
    adjusted.forEach((item) => {
      item.adjustedY += shift;
    });
  }

  return adjusted;
}

export function ExpenseDonutChart({
  data,
  title = 'Yearly Expense',
  subtitle = 'Breakdown by Category',
  className,
}: ExpenseDonutChartProps) {
  const currencyCode = useCurrencyStore((s) => s.currencyCode);
  const compactFormatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currencyCode,
        notation: 'compact',
        maximumFractionDigits: 1,
      }),
    [currencyCode],
  );

  const chartData = useMemo(() => {
    return data
      .filter((datum) => datum.valueCents > 0)
      .map((datum, index) => ({
        ...datum,
        shortLabel:
          datum.label.length > MAX_LABEL_LENGTH
            ? `${datum.label.slice(0, MAX_LABEL_LENGTH - 1)}…`
            : datum.label,
        value: centsToDollars(datum.valueCents),
        formatted: formatMoney(datum.valueCents, { currency: currencyCode }),
        compactFormatted: compactFormatter.format(
          centsToDollars(datum.valueCents),
        ),
        fill: datum.color ?? COLOR_PALETTE[index % COLOR_PALETTE.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [data, compactFormatter, currencyCode]);

  const totalCents = useMemo(
    () => chartData.reduce((sum, datum) => sum + datum.valueCents, 0),
    [chartData],
  );

  const totalFormatted = useMemo(
    () => formatMoney(totalCents, { currency: currencyCode }),
    [totalCents, currencyCode],
  );

  const hasData = chartData.length > 0 && totalCents > 0;

  const { ref: chartRef, size } = useElementSize<HTMLDivElement>();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const chartWidth = size.width || 360;
  const chartHeight = size.height || 340;

  const handleSliceEnter = useCallback((_: unknown, index: number) => {
    setActiveIndex(index);
  }, []);

  const handleSliceLeave = useCallback(() => {
    setActiveIndex(null);
  }, []);

  const geometry = useMemo(() => {
    if (!size.width || !size.height) return null;
    const radius = Math.min(size.width, size.height) * 0.32;
    const outerRadius = Math.max(radius, 88);
    const innerRadius = outerRadius * 0.62;
    return {
      cx: size.width / 2,
      cy: size.height / 2,
      outerRadius,
      innerRadius,
    };
  }, [size]);

  const labelLayouts = useMemo<LabelLayout[]>(() => {
    if (!geometry || !hasData) return [];

    const total = chartData.reduce((sum, datum) => sum + datum.value, 0);
    if (total === 0) return [];

    const { cx, cy, outerRadius } = geometry;
    const minY = 16;
    const maxY = size.height - 16;

    const raw = chartData.reduce<{
      cumulative: number;
      items: Array<{
        index: number;
        rawY: number;
        lineStartX: number;
        lineStartY: number;
        lineBreakX: number;
        lineBreakY: number;
        side: 'left' | 'right';
      }>;
    }>(
      (acc, datum, index) => {
        const sliceAngle = (datum.value / total) * 360;
        const midAngle = START_ANGLE - (acc.cumulative + sliceAngle / 2);
        const radians = (Math.PI / 180) * midAngle;
        const isRight = Math.cos(radians) >= 0;
        const lineStartX = cx + Math.cos(radians) * (outerRadius + 2);
        const lineStartY = cy + Math.sin(radians) * (outerRadius + 2);
        const lineBreakX = cx + Math.cos(radians) * (outerRadius + 16);
        const lineBreakY = cy + Math.sin(radians) * (outerRadius + 16);
        const rawY = cy + Math.sin(radians) * (outerRadius + 28);

        const item = {
          index,
          rawY,
          lineStartX,
          lineStartY,
          lineBreakX,
          lineBreakY,
          side: isRight ? 'right' : 'left',
        };

        return {
          cumulative: acc.cumulative + sliceAngle,
          items: [...acc.items, item],
        };
      },
      { cumulative: 0, items: [] },
    ).items;

    const left = adjustLabelPositions(
      raw.filter((item) => item.side === 'left'),
      minY,
      maxY,
    );
    const right = adjustLabelPositions(
      raw.filter((item) => item.side === 'right'),
      minY,
      maxY,
    );

    const layouts: LabelLayout[] = new Array(chartData.length);
    for (const item of [...left, ...right]) {
      const labelX =
        item.side === 'right'
          ? Math.min(geometry.cx + geometry.outerRadius + 80, size.width - 12)
          : Math.max(geometry.cx - geometry.outerRadius - 80, 12);
      const lineEndX = item.side === 'right' ? labelX - 8 : labelX + 8;
      const textAnchor = item.side === 'right' ? 'start' : 'end';

      layouts[item.index] = {
        index: item.index,
        lineStartX: item.lineStartX,
        lineStartY: item.lineStartY,
        lineBreakX: item.lineBreakX,
        lineBreakY: item.lineBreakY,
        lineEndX,
        lineEndY: item.adjustedY,
        textX: labelX,
        textY: item.adjustedY,
        textAnchor,
        side: item.side,
      };
    }

    return layouts;
  }, [chartData, geometry, hasData, size]);

  const ariaLabel = useMemo(() => {
    if (!hasData) return 'Expense breakdown donut chart with no data.';
    return `Yearly expense breakdown donut chart showing ${
      chartData.length
    } categories: ${chartData
      .map((datum) => `${datum.label} ${datum.formatted}`)
      .join(', ')}`;
  }, [chartData, hasData]);

  if (!hasData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-balance">{title}</CardTitle>
          <p className="text-muted-foreground text-sm">{subtitle}</p>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={PieChartIcon}
            title="No Expenses Yet"
            description="Add expenses to see a premium category breakdown."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-balance">{title}</CardTitle>
        <p className="text-muted-foreground text-sm">{subtitle}</p>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            'relative h-[340px] w-full',
            '[--donut-1:#4f7eff] [--donut-2:#6b5dd3] [--donut-3:#9a65f6] [--donut-4:#e059c6] [--donut-5:#f2a13a] [--donut-6:#e35c5c] [--donut-7:#4cb7a7]',
            'dark:[--donut-1:#6e9aff] dark:[--donut-2:#8a7df0] dark:[--donut-3:#b088ff] dark:[--donut-4:#f07ad5] dark:[--donut-5:#ffb764] dark:[--donut-6:#f27a7a] dark:[--donut-7:#6fd6c7]',
            '[--donut-stroke:rgba(255,255,255,0.85)] dark:[--donut-stroke:rgba(15,23,42,0.65)]',
          )}
        >
          <div
            ref={chartRef}
            className="h-full w-full"
            role="img"
            aria-label={ariaLabel}
          >
            <PieChart width={chartWidth} height={chartHeight}>
              <ChartTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const datum = payload[0]
                    .payload as (typeof chartData)[number];
                  const percent =
                    totalCents > 0
                      ? ((datum.valueCents / totalCents) * 100).toFixed(1)
                      : '0.0';
                  return (
                    <div className="bg-background/95 border-border/60 rounded-lg border px-3 py-2 text-xs shadow-xl backdrop-blur">
                      <p className="text-foreground mb-1 font-medium">
                        {datum.label}
                      </p>
                      <p className="text-muted-foreground">
                        {datum.formatted} · {percent}%
                      </p>
                    </div>
                  );
                }}
              />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="label"
                startAngle={START_ANGLE}
                endAngle={END_ANGLE}
                innerRadius={geometry?.innerRadius ?? 70}
                outerRadius={geometry?.outerRadius ?? 110}
                paddingAngle={2}
                cornerRadius={10}
                stroke="var(--donut-stroke)"
                strokeWidth={2}
                labelLine={false}
                onMouseEnter={handleSliceEnter}
                onMouseLeave={handleSliceLeave}
                label={({ index }) => {
                  const layout = labelLayouts[index ?? 0];
                  const datum = chartData[index ?? 0];
                  if (!layout || !datum) return null;
                  const lineColor = datum.fill;
                  return (
                    <g>
                      <path
                        d={`M${layout.lineStartX},${layout.lineStartY} L${layout.lineBreakX},${layout.lineBreakY} L${layout.lineEndX},${layout.lineEndY}`}
                        stroke={lineColor}
                        strokeOpacity={0.45}
                        strokeWidth={1.25}
                        fill="none"
                      />
                      <circle
                        cx={layout.lineEndX}
                        cy={layout.lineEndY}
                        r={2.4}
                        fill={lineColor}
                        fillOpacity={0.8}
                      />
                      <text
                        x={layout.textX}
                        y={layout.textY - 2}
                        textAnchor={layout.textAnchor}
                        className="fill-foreground text-[13px] font-semibold tabular-nums"
                      >
                        {datum.compactFormatted}
                      </text>
                      <text
                        x={layout.textX}
                        y={layout.textY + 12}
                        textAnchor={layout.textAnchor}
                        className="fill-muted-foreground text-[11px]"
                      >
                        {datum.shortLabel}
                      </text>
                    </g>
                  );
                }}
                className="drop-shadow-[0_10px_24px_rgba(15,23,42,0.18)] dark:drop-shadow-[0_10px_24px_rgba(0,0,0,0.5)]"
              >
                {chartData.map((entry, index) => {
                  const isActive = activeIndex === index;
                  const isDimmed = activeIndex !== null && !isActive;
                  return (
                    <Cell
                      key={entry.category}
                      fill={entry.fill}
                      className="transition-opacity duration-300 motion-reduce:transition-none"
                      style={{
                        opacity: isDimmed ? 0.45 : 1,
                        filter: isActive
                          ? 'drop-shadow(0 6px 12px rgba(15,23,42,0.22))'
                          : undefined,
                      }}
                    />
                  );
                })}
              </Pie>
            </PieChart>
          </div>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground text-[11px] uppercase tracking-[0.3em]">
                Total
              </p>
              <p className="text-foreground mt-2 text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
                {totalFormatted}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
