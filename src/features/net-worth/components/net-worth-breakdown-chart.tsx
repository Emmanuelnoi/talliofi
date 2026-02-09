import { useMemo } from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import type { AssetCategory, LiabilityCategory } from '@/domain/plan';
import { formatMoney, centsToDollars } from '@/domain/money';
import type { Cents } from '@/domain/money';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from '@/components/ui/chart';
import { EmptyState } from '@/components/feedback/empty-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartDataTable } from '@/components/accessibility';
import {
  ASSET_CATEGORY_LABELS,
  ASSET_CATEGORY_COLORS,
  LIABILITY_CATEGORY_LABELS,
  LIABILITY_CATEGORY_COLORS,
} from '@/lib/constants';

interface NetWorthBreakdownChartProps {
  assetsByCategory: Map<AssetCategory, Cents>;
  liabilitiesByCategory: Map<LiabilityCategory, Cents>;
}

interface ChartDatum {
  id: string;
  name: string;
  value: number;
  fill: string;
  formatted: string;
}

export function NetWorthBreakdownChart({
  assetsByCategory,
  liabilitiesByCategory,
}: NetWorthBreakdownChartProps) {
  const assetData: ChartDatum[] = useMemo(() => {
    const data: ChartDatum[] = [];
    for (const [category, amount] of assetsByCategory) {
      if (amount > 0) {
        data.push({
          id: category,
          name: ASSET_CATEGORY_LABELS[category],
          value: centsToDollars(amount),
          fill: ASSET_CATEGORY_COLORS[category],
          formatted: formatMoney(amount),
        });
      }
    }
    return data.sort((a, b) => b.value - a.value);
  }, [assetsByCategory]);

  const liabilityData: ChartDatum[] = useMemo(() => {
    const data: ChartDatum[] = [];
    for (const [category, amount] of liabilitiesByCategory) {
      if (amount > 0) {
        data.push({
          id: category,
          name: LIABILITY_CATEGORY_LABELS[category],
          value: centsToDollars(amount),
          fill: LIABILITY_CATEGORY_COLORS[category],
          formatted: formatMoney(amount),
        });
      }
    }
    return data.sort((a, b) => b.value - a.value);
  }, [liabilitiesByCategory]);

  const assetChartConfig: ChartConfig = useMemo(() => {
    const config: ChartConfig = {};
    for (const datum of assetData) {
      config[datum.name] = {
        label: datum.name,
        color: datum.fill,
      };
    }
    return config;
  }, [assetData]);

  const liabilityChartConfig: ChartConfig = useMemo(() => {
    const config: ChartConfig = {};
    for (const datum of liabilityData) {
      config[datum.name] = {
        label: datum.name,
        color: datum.fill,
      };
    }
    return config;
  }, [liabilityData]);

  const hasAssets = assetData.length > 0;
  const hasLiabilities = liabilityData.length > 0;

  if (!hasAssets && !hasLiabilities) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={PieChartIcon}
            title="No data yet"
            description="Add assets and liabilities to see the breakdown."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={hasAssets ? 'assets' : 'liabilities'}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="assets" disabled={!hasAssets}>
              Assets
            </TabsTrigger>
            <TabsTrigger value="liabilities" disabled={!hasLiabilities}>
              Liabilities
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assets" className="mt-4">
            {hasAssets ? (
              <BreakdownPieChart
                data={assetData}
                config={assetChartConfig}
                colorScheme="assets"
              />
            ) : (
              <EmptyState
                icon={PieChartIcon}
                title="No assets"
                description="Add assets to see the breakdown."
              />
            )}
          </TabsContent>

          <TabsContent value="liabilities" className="mt-4">
            {hasLiabilities ? (
              <BreakdownPieChart
                data={liabilityData}
                config={liabilityChartConfig}
                colorScheme="liabilities"
              />
            ) : (
              <EmptyState
                icon={PieChartIcon}
                title="No liabilities"
                description="Add liabilities to see the breakdown."
              />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface BreakdownPieChartProps {
  data: ChartDatum[];
  config: ChartConfig;
  colorScheme: 'assets' | 'liabilities';
}

function BreakdownPieChart({
  data,
  config,
  colorScheme,
}: BreakdownPieChartProps) {
  const ariaLabel = `${colorScheme === 'assets' ? 'Asset' : 'Liability'} breakdown chart showing ${data.length} categories: ${data.map((d) => `${d.name} ${d.formatted}`).join(', ')}`;

  // Data for accessible table alternative
  const tableData = useMemo(
    () =>
      data.map((d) => ({
        label: d.name,
        value: d.formatted,
      })),
    [data],
  );

  return (
    <>
      <ChartContainer
        config={config}
        className="mx-auto aspect-square max-h-[250px]"
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
                  <p className="text-muted-foreground">{datum.formatted}</p>
                </div>
              );
            }}
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={50}
            strokeWidth={2}
          >
            {data.map((entry) => (
              <Cell key={entry.id} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>

      {/* Screen-reader data summary */}
      <div className="sr-only">
        <ul>
          {data.map((d) => (
            <li key={d.id}>
              {d.name}: {d.formatted}
            </li>
          ))}
        </ul>
      </div>

      {/* Visible legend */}
      <ul className="mt-4 grid gap-2" aria-label={`${colorScheme} legend`}>
        {data.map((d) => (
          <li key={d.id} className="flex items-center gap-2 text-sm">
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: d.fill }}
              aria-hidden="true"
            />
            <span className="flex-1 truncate">{d.name}</span>
            <span className="text-muted-foreground tabular-nums">
              {d.formatted}
            </span>
          </li>
        ))}
      </ul>

      {/* Accessible data table alternative */}
      <ChartDataTable
        title={`${colorScheme === 'assets' ? 'Assets' : 'Liabilities'} Breakdown`}
        labelHeader="Category"
        valueHeader="Amount"
        data={tableData}
      />
    </>
  );
}
