import { useMemo, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Target,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { centsToDollars, formatMoney } from '@/domain/money';
import { useCurrencyStore } from '@/stores/currency-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { EmptyState } from '@/components/feedback/empty-state';
import { getErrorMessage } from '@/lib/error-message';
import type { BudgetAdherenceReport as ReportData } from '../types';
import {
  exportBudgetAdherenceCSV,
  exportBudgetAdherencePDF,
  downloadReportCSV,
  downloadReportPDF,
} from '../utils/report-export';

interface BudgetAdherenceReportProps {
  report: ReportData | null;
}

/** Status colors */
const STATUS_COLORS = {
  under: '#10B981', // Green - under budget
  on_target: '#3B82F6', // Blue - on target
  over: '#EF4444', // Red - over budget
};

const STATUS_LABELS = {
  under: 'Under Budget',
  on_target: 'On Target',
  over: 'Over Budget',
};

export default function BudgetAdherenceReport({
  report,
}: BudgetAdherenceReportProps) {
  const navigate = useNavigate();
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);
  const currencyCode = useCurrencyStore((s) => s.currencyCode);

  const chartData = useMemo(() => {
    if (!report) return [];
    return report.data.map((item) => ({
      bucketId: item.bucketId,
      name: item.bucketName,
      target: centsToDollars(item.targetCents),
      actual: centsToDollars(item.actualCents),
      targetCents: item.targetCents,
      actualCents: item.actualCents,
      adherence: item.adherencePercent,
      status: item.status,
      color: item.bucketColor,
    }));
  }, [report]);

  const handleBucketClick = useCallback(
    (bucketId: string) => {
      if (!report) return;
      const dateFrom = format(report.dateRange.start, 'yyyy-MM-dd');
      const dateTo = format(report.dateRange.end, 'yyyy-MM-dd');
      void navigate(
        `/expenses?buckets=${encodeURIComponent(bucketId)}&dateFrom=${dateFrom}&dateTo=${dateTo}`,
      );
    },
    [navigate, report],
  );

  const handleExport = async (format: 'csv' | 'pdf') => {
    if (!report) return;
    setExporting(format);

    try {
      if (format === 'csv') {
        const csv = exportBudgetAdherenceCSV(report, currencyCode);
        downloadReportCSV(csv, 'budget-adherence');
        toast.success('CSV exported successfully');
      } else {
        const blob = await exportBudgetAdherencePDF(report, currencyCode);
        downloadReportPDF(blob, 'budget-adherence');
        toast.success('PDF exported successfully');
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to export report.'));
    } finally {
      setExporting(null);
    }
  };

  if (!report || report.data.length === 0) {
    return (
      <Card className="print:shadow-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Budget Adherence</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Target}
            title="No budget data"
            description="No buckets configured or no expenses in this date range."
          />
        </CardContent>
      </Card>
    );
  }

  // Calculate status counts
  const statusCounts = report.data.reduce(
    (acc, item) => {
      acc[item.status]++;
      return acc;
    },
    { under: 0, on_target: 0, over: 0 } as Record<string, number>,
  );

  return (
    <Card className="print:shadow-none print:break-inside-avoid">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Budget Adherence</CardTitle>
          <p className="text-muted-foreground text-sm">
            How well spending matches allocations
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
                <Loader2 className="size-4 motion-safe:animate-spin" />
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
        {/* Overall Score */}
        <div className="mb-6 rounded-lg border p-4 text-center">
          <p className="text-muted-foreground text-sm">
            Overall Adherence Score
          </p>
          <p
            className={`text-3xl font-bold ${
              report.overallAdherencePercent >= 80
                ? 'text-emerald-600 dark:text-emerald-400'
                : report.overallAdherencePercent >= 60
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-red-600 dark:text-red-400'
            }`}
          >
            {report.overallAdherencePercent.toFixed(0)}%
          </p>
          <div className="mt-2 flex justify-center gap-4 text-xs">
            <span className="flex items-center gap-1">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: STATUS_COLORS.under }}
              />
              {statusCounts.under} under
            </span>
            <span className="flex items-center gap-1">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: STATUS_COLORS.on_target }}
              />
              {statusCounts.on_target} on target
            </span>
            <span className="flex items-center gap-1">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: STATUS_COLORS.over }}
              />
              {statusCounts.over} over
            </span>
          </div>
        </div>

        {/* Bar Chart */}
        <ChartContainer
          config={{
            target: { label: 'Available', color: 'var(--color-muted)' },
            actual: { label: 'Actual' },
          }}
          className="h-[300px] w-full"
          role="img"
          aria-label="Budget adherence bar chart comparing target vs actual spending by bucket"
        >
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 80 }}
            accessibilityLayer
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              tickLine={false}
              axisLine={false}
              width={75}
              tick={{ fontSize: 12 }}
            />
            <ChartTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0].payload as (typeof chartData)[0];
                return (
                  <div className="border-border/60 bg-card/95 text-foreground/90 rounded-lg border px-3 py-2 text-[11px] shadow-xl backdrop-blur">
                    <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.2em]">
                      {data.name}
                    </p>
                    <div className="mt-1 space-y-1">
                      <p className="text-muted-foreground tabular-nums">
                        Target:{' '}
                        {formatMoney(data.targetCents, {
                          currency: currencyCode,
                        })}
                      </p>
                      <p className="text-muted-foreground tabular-nums">
                        Actual:{' '}
                        {formatMoney(data.actualCents, {
                          currency: currencyCode,
                        })}
                      </p>
                      <p className="text-muted-foreground tabular-nums">
                        Adherence: {data.adherence.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="target"
              fill="var(--color-muted)"
              radius={[0, 4, 4, 0]}
              maxBarSize={20}
            />
            <Bar
              dataKey="actual"
              radius={[0, 4, 4, 0]}
              maxBarSize={20}
              onClick={(_: unknown, index: number) => {
                const item = report.data[index];
                if (item) handleBucketClick(item.bucketId);
              }}
              className="cursor-pointer"
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={
                    STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS]
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>

        {/* Data Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left font-medium">Bucket</th>
                <th className="py-2 text-right font-medium">Target</th>
                <th className="py-2 text-right font-medium">Actual</th>
                <th className="py-2 text-right font-medium">Variance</th>
                <th className="py-2 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {report.data.map((item) => (
                <tr
                  key={item.bucketId}
                  className="border-b last:border-0 cursor-pointer hover:bg-muted/40"
                  onClick={() => handleBucketClick(item.bucketId)}
                >
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.bucketColor }}
                      />
                      {item.bucketName}
                    </div>
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {formatMoney(item.targetCents, { currency: currencyCode })}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {formatMoney(item.actualCents, { currency: currencyCode })}
                  </td>
                  <td
                    className={`py-2 text-right tabular-nums ${
                      item.varianceCents > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : item.varianceCents < 0
                          ? 'text-red-600 dark:text-red-400'
                          : ''
                    }`}
                  >
                    {item.varianceCents > 0 ? '+' : ''}
                    {formatMoney(item.varianceCents, {
                      currency: currencyCode,
                    })}
                  </td>
                  <td className="py-2 text-center">
                    <Badge
                      variant={
                        item.status === 'over'
                          ? 'destructive'
                          : item.status === 'under'
                            ? 'default'
                            : 'secondary'
                      }
                      className="text-xs"
                    >
                      {STATUS_LABELS[item.status]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
