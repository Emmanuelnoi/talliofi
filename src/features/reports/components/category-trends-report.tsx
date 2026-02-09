import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Cents } from '@/domain/money';
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
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { EmptyState } from '@/components/feedback/empty-state';
import type { CategoryTrendsReport as ReportData } from '../types';
import {
  exportCategoryTrendsCSV,
  exportCategoryTrendsPDF,
  downloadReportCSV,
  downloadReportPDF,
} from '../utils/report-export';

interface CategoryTrendsReportProps {
  report: ReportData | null;
}

/** Maximum number of categories to show in the chart to avoid clutter */
const MAX_CHART_CATEGORIES = 6;

export function CategoryTrendsReport({ report }: CategoryTrendsReportProps) {
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);

  // Transform data for recharts (needs one object per month with all categories as properties)
  const chartData = useMemo(() => {
    if (!report || report.months.length === 0) return [];

    return report.months.map((yearMonth, monthIndex) => {
      const dataPoint: Record<string, number | string> = {
        month: report.trends[0]?.dataPoints[monthIndex]?.label ?? yearMonth,
      };

      // Only include top categories in chart
      const topTrends = report.trends.slice(0, MAX_CHART_CATEGORIES);
      for (const trend of topTrends) {
        dataPoint[trend.category] = centsToDollars(
          trend.dataPoints[monthIndex]?.amountCents ?? 0,
        );
      }

      return dataPoint;
    });
  }, [report]);

  const chartConfig = useMemo(() => {
    if (!report) return {} as ChartConfig;
    const config: ChartConfig = {};
    const topTrends = report.trends.slice(0, MAX_CHART_CATEGORIES);
    for (const trend of topTrends) {
      config[trend.category] = {
        label: trend.label,
        color: trend.color,
      };
    }
    return config;
  }, [report]);

  const handleExport = async (format: 'csv' | 'pdf') => {
    if (!report) return;
    setExporting(format);

    try {
      if (format === 'csv') {
        const csv = exportCategoryTrendsCSV(report);
        downloadReportCSV(csv, 'category-trends');
        toast.success('CSV exported successfully');
      } else {
        const blob = exportCategoryTrendsPDF(report);
        downloadReportPDF(blob, 'category-trends');
        toast.success('PDF exported successfully');
      }
    } catch {
      toast.error('Failed to export report');
    } finally {
      setExporting(null);
    }
  };

  if (!report || report.trends.length === 0) {
    return (
      <Card className="print:shadow-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Category Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={TrendingUp}
            title="No trend data"
            description="No expenses found in this date range."
          />
        </CardContent>
      </Card>
    );
  }

  const topTrends = report.trends.slice(0, MAX_CHART_CATEGORIES);

  return (
    <Card className="print:shadow-none print:break-inside-avoid">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Category Trends</CardTitle>
          <p className="text-muted-foreground text-sm">
            Spending over time by category
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
        {/* Line Chart */}
        <ChartContainer
          config={chartConfig}
          className="h-[350px] w-full"
          role="img"
          aria-label="Line chart showing spending trends by category over time"
        >
          <LineChart data={chartData} accessibilityLayer>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
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
            <Legend />
            {topTrends.map((trend) => (
              <Line
                key={trend.category}
                type="monotone"
                dataKey={trend.category}
                name={trend.label}
                stroke={trend.color}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ChartContainer>

        {/* Category Summary Table */}
        <div className="mt-6">
          <h4 className="mb-3 text-sm font-medium">Category Summary</h4>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {report.trends.map((trend) => {
              const total = trend.dataPoints.reduce(
                (sum, p) => sum + p.amountCents,
                0,
              );
              const avg = total / trend.dataPoints.length;

              return (
                <div
                  key={trend.category}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: trend.color }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{trend.label}</p>
                    <p className="text-muted-foreground text-xs">
                      Avg: {formatMoney(Math.round(avg) as Cents)}/mo
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Note about limited chart categories */}
        {report.trends.length > MAX_CHART_CATEGORIES && (
          <p className="text-muted-foreground mt-4 text-xs">
            Chart shows top {MAX_CHART_CATEGORIES} categories. Export to CSV for
            all {report.trends.length} categories.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
