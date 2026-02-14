import {
  useMemo,
  useRef,
  useEffect,
  useState,
  useCallback,
  useLayoutEffect,
} from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import type { Cents } from '@/domain/money';
import { addMoney, cents, centsToDollars, formatMoney } from '@/domain/money';
import { useCurrencyStore } from '@/stores/currency-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartTooltip } from '@/components/ui/chart';
import { EmptyState } from '@/components/feedback/empty-state';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/lib/utils';

const START_ANGLE = 90;
const END_ANGLE = -270;

const COLOR_PALETTE = [
  'var(--donut-1)',
  'var(--donut-2)',
  'var(--donut-3)',
  'var(--donut-4)',
  'var(--donut-5)',
  'var(--donut-6)',
  'var(--donut-7)',
];

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

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setSize({ width: rect.width, height: rect.height });
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    const element = ref.current;
    let rafId: number | null = null;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
        rafId = null;
      });
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return { ref, size };
}

export function ExpenseDonutChart({
  data,
  title = 'Yearly Expense',
  subtitle = 'Breakdown by Category',
  className,
}: ExpenseDonutChartProps) {
  const currencyCode = useCurrencyStore((s) => s.currencyCode);
  const prefersReducedMotion = useReducedMotion();

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
    () =>
      chartData.reduce(
        (sum, datum) => addMoney(sum, datum.valueCents),
        cents(0),
      ),
    [chartData],
  );

  const totalFormatted = useMemo(
    () => formatMoney(totalCents, { currency: currencyCode }),
    [totalCents, currencyCode],
  );

  const hasData = chartData.length > 0 && totalCents > 0;

  const { ref: chartRef, size } = useElementSize<HTMLDivElement>();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const chartWidth = size.width || 360;
  const chartHeight = size.height || 240;

  useEffect(() => {
    if (hasData) {
      const id = requestAnimationFrame(() => setMounted(true));
      return () => cancelAnimationFrame(id);
    }
  }, [hasData]);

  const handleSliceEnter = useCallback((_: unknown, index: number) => {
    setActiveIndex(index);
  }, []);

  const handleSliceLeave = useCallback(() => {
    setActiveIndex(null);
  }, []);

  const handleSliceClick = useCallback((_: unknown, index: number) => {
    setActiveIndex((prev) => (prev === index ? null : index));
  }, []);

  const handleLegendInteract = useCallback((index: number) => {
    setActiveIndex((prev) => (prev === index ? null : index));
  }, []);

  const handleLegendKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleLegendInteract(index);
      }
    },
    [handleLegendInteract],
  );

  const geometry = useMemo(() => {
    if (!size.width || !size.height) return null;
    const radius = Math.min(size.width, size.height) * 0.38;
    const outerRadius = Math.max(radius, 80);
    const innerRadius = outerRadius * 0.615;
    return {
      cx: size.width / 2,
      cy: size.height / 2,
      outerRadius,
      innerRadius,
    };
  }, [size]);

  const percentages = useMemo(() => {
    if (totalCents <= 0) return [];
    return chartData.map((datum) =>
      ((datum.valueCents / totalCents) * 100).toFixed(1),
    );
  }, [chartData, totalCents]);

  const ariaLabel = useMemo(() => {
    if (!hasData) return 'Expense breakdown donut chart with no data.';
    return `Yearly expense breakdown showing ${chartData.length} categories: ${chartData
      .map(
        (datum, i) => `${datum.label} ${datum.formatted} (${percentages[i]}%)`,
      )
      .join(', ')}`;
  }, [chartData, hasData, percentages]);

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
            title="No expenses recorded"
            description="Start by adding a transaction to see your spending patterns here."
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
            '[--donut-1:#4f7eff] [--donut-2:#6b5dd3] [--donut-3:#9a65f6] [--donut-4:#e059c6] [--donut-5:#f2a13a] [--donut-6:#e35c5c] [--donut-7:#4cb7a7]',
            'dark:[--donut-1:#6e9aff] dark:[--donut-2:#8a7df0] dark:[--donut-3:#b088ff] dark:[--donut-4:#f07ad5] dark:[--donut-5:#ffb764] dark:[--donut-6:#f27a7a] dark:[--donut-7:#6fd6c7]',
            '[--donut-stroke:rgba(255,255,255,0.85)] dark:[--donut-stroke:rgba(15,23,42,0.65)]',
          )}
        >
          {/* Donut chart area */}
          <div className="relative h-[240px] w-full sm:h-[280px]">
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
                    const idx = chartData.indexOf(datum);
                    const percent = idx >= 0 ? percentages[idx] : '0.0';
                    return (
                      <div className="border-border/60 bg-card/90 text-foreground/90 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl backdrop-blur-lg">
                        <p className="font-medium">
                          {datum.label} &middot; {datum.formatted} ({percent}%)
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
                  innerRadius={geometry?.innerRadius ?? 55}
                  outerRadius={geometry?.outerRadius ?? 90}
                  paddingAngle={2}
                  cornerRadius={10}
                  stroke="var(--donut-stroke)"
                  strokeWidth={2}
                  labelLine={false}
                  onMouseEnter={handleSliceEnter}
                  onMouseLeave={handleSliceLeave}
                  onClick={handleSliceClick}
                  className={cn(
                    'cursor-pointer',
                    'drop-shadow-[0_4px_8px_rgba(15,23,42,0.1)] dark:drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]',
                  )}
                >
                  {chartData.map((entry, index) => {
                    const isActive = activeIndex === index;
                    const isDimmed = activeIndex !== null && !isActive;
                    return (
                      <Cell
                        key={entry.category}
                        fill={entry.fill}
                        className="transition-all duration-200 motion-reduce:transition-none"
                        style={{
                          opacity: isDimmed ? 0.35 : 1,
                          filter: isActive
                            ? 'drop-shadow(0 8px 16px rgba(15,23,42,0.2))'
                            : undefined,
                        }}
                      />
                    );
                  })}
                </Pie>
              </PieChart>
            </div>

            {/* Center total */}
            <div
              className={cn(
                'pointer-events-none absolute inset-0 flex items-center justify-center',
                !prefersReducedMotion && 'transition-opacity duration-500',
                !prefersReducedMotion && !mounted && 'opacity-0',
                !prefersReducedMotion && mounted && 'opacity-100',
              )}
            >
              <div className="text-center">
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.2em]">
                  Total
                </p>
                <p className="text-foreground mt-1.5 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
                  {totalFormatted}
                </p>
              </div>
            </div>
          </div>

          {/* Interactive legend */}
          <ul
            className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3"
            role="list"
          >
            {chartData.map((datum, index) => {
              const isActive = activeIndex === index;
              const isDimmed = activeIndex !== null && !isActive;
              const percent = percentages[index];
              return (
                <li
                  key={datum.category}
                  role="listitem"
                  tabIndex={0}
                  className={cn(
                    'flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 transition-all duration-200 motion-reduce:transition-none',
                    'hover:bg-accent/60 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
                    isActive && 'bg-accent/80',
                    isDimmed && 'opacity-50',
                    !prefersReducedMotion && 'animate-in fade-in',
                  )}
                  style={
                    !prefersReducedMotion
                      ? { animationDelay: `${index * 40}ms` }
                      : undefined
                  }
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onClick={() => handleLegendInteract(index)}
                  onKeyDown={(e) => handleLegendKeyDown(e, index)}
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: datum.fill }}
                    aria-hidden="true"
                  />
                  <span className="text-foreground min-w-0 flex-1 truncate text-xs font-medium">
                    {datum.label}
                  </span>
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    {percent}%
                  </span>
                  <span className="text-foreground shrink-0 text-xs font-medium tabular-nums">
                    {datum.compactFormatted}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
