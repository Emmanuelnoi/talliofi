import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { centsToDollars, formatMoney } from '@/domain/money';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from '@/components/ui/chart';
import { EmptyState } from '@/components/feedback/empty-state';
import type { SpendingByCategoryReport as ReportData } from '../types';
import {
  exportSpendingByCategoryCSV,
  exportSpendingByCategoryPDF,
  downloadReportCSV,
  downloadReportPDF,
} from '../utils/report-export';

interface SpendingByCategoryReportProps {
  report: ReportData | null;
}

/** Category colors for the pie chart */
const CATEGORY_COLORS: string[] = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
  '#9B59B6',
  '#1ABC9C',
  '#F39C12',
  '#E74C3C',
  '#3498DB',
  '#27AE60',
  '#8E44AD',
  '#E67E22',
];

export function SpendingByCategoryReport({
  report,
}: SpendingByCategoryReportProps) {
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);

  const chartData = useMemo(() => {
    if (!report) return [];
    return report.data.map((item, index) => ({
      name: item.label,
      value: centsToDollars(item.totalCents),
      fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      totalCents: item.totalCents,
      percentage: item.percentage,
    }));
  }, [report]);

  const chartConfig: ChartConfig = useMemo(() => {
    if (!report) return {};
    const config: ChartConfig = {};
    for (const item of report.data) {
      config[item.label] = {
        label: item.label,
      };
    }
    return config;
  }, [report]);

  const handleExport = async (format: 'csv' | 'pdf') => {
    if (!report) return;
    setExporting(format);

    try {
      if (format === 'csv') {
        const csv = exportSpendingByCategoryCSV(report);
        downloadReportCSV(csv, 'spending-by-category');
        toast.success('CSV exported successfully');
      } else {
        const blob = exportSpendingByCategoryPDF(report);
        downloadReportPDF(blob, 'spending-by-category');
        toast.success('PDF exported successfully');
      }
    } catch {
      toast.error('Failed to export report');
    } finally {
      setExporting(null);
    }
  };

  if (!report || report.data.length === 0) {
    return (
      <Card className="print:shadow-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Spending by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={PieChartIcon}
            title="No spending data"
            description="No expenses found in this date range."
          />
        </CardContent>
      </Card>
    );
  }

  const ariaLabel = `Spending by category pie chart: ${report.data.map((d) => `${d.label} ${formatMoney(d.totalCents)}`).join(', ')}`;

  return (
    <Card className="print:shadow-none print:break-inside-avoid">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Spending by Category</CardTitle>
          <p className="text-muted-foreground text-sm">
            Total: {formatMoney(report.totalCents)}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={exporting !== null}
              className="print:hidden"
            >
              {exporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleExport('csv')}>
              <FileSpreadsheet className="size-4" />
              Export CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('pdf')}>
              <FileText className="size-4" />
              Export PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pie Chart */}
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[300px]"
            role="img"
            aria-label={ariaLabel}
          >
            <PieChart>
              <ChartTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload as (typeof chartData)[0];
                  return (
                    <div className="bg-background border-border/50 rounded-lg border px-3 py-2 text-xs shadow-xl">
                      <p className="mb-1 font-medium">{data.name}</p>
                      <p className="text-muted-foreground">
                        {formatMoney(data.totalCents)} (
                        {data.percentage.toFixed(1)}%)
                      </p>
                    </div>
                  );
                }}
              />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                strokeWidth={2}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>

          {/* Data Table */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Breakdown</h4>
            <div className="space-y-1">
              {report.data.map((item, index) => (
                <div
                  key={item.category}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                      }}
                      aria-hidden="true"
                    />
                    <span>{item.label}</span>
                    <span className="text-muted-foreground text-xs">
                      ({item.expenseCount})
                    </span>
                  </div>
                  <div className="text-right tabular-nums">
                    <span className="font-medium">
                      {formatMoney(item.totalCents)}
                    </span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Screen reader summary */}
        <div className="sr-only">
          <ul>
            {report.data.map((d) => (
              <li key={d.category}>
                {d.label}: {formatMoney(d.totalCents)} (
                {d.percentage.toFixed(1)}%)
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
