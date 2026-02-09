import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
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
import type { IncomeVsExpensesReport as ReportData } from '../types';
import {
  exportIncomeVsExpensesCSV,
  exportIncomeVsExpensesPDF,
  downloadReportCSV,
  downloadReportPDF,
} from '../utils/report-export';

interface IncomeVsExpensesReportProps {
  report: ReportData | null;
}

const chartConfig = {
  income: {
    label: 'Net Income',
    color: 'var(--surplus)',
  },
  expenses: {
    label: 'Expenses',
    color: 'var(--deficit)',
  },
} satisfies ChartConfig;

export function IncomeVsExpensesReport({ report }: IncomeVsExpensesReportProps) {
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);

  const chartData = useMemo(() => {
    if (!report) return [];
    return report.data.map((item) => ({
      month: item.label,
      income: centsToDollars(item.incomeCents),
      expenses: centsToDollars(item.expensesCents),
      incomeCents: item.incomeCents,
      expensesCents: item.expensesCents,
      surplusCents: item.surplusCents,
    }));
  }, [report]);

  const handleExport = async (format: 'csv' | 'pdf') => {
    if (!report) return;
    setExporting(format);

    try {
      if (format === 'csv') {
        const csv = exportIncomeVsExpensesCSV(report);
        downloadReportCSV(csv, 'income-vs-expenses');
        toast.success('CSV exported successfully');
      } else {
        const blob = exportIncomeVsExpensesPDF(report);
        downloadReportPDF(blob, 'income-vs-expenses');
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
          <CardTitle>Income vs Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={TrendingUp}
            title="No data available"
            description="No data found for this date range."
          />
        </CardContent>
      </Card>
    );
  }

  const netStatus =
    report.totalSurplusCents >= 0 ? 'surplus' : 'deficit';
  const netLabel = netStatus === 'surplus' ? 'Net Surplus' : 'Net Deficit';

  return (
    <Card className="print:shadow-none print:break-inside-avoid">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Income vs Expenses</CardTitle>
          <p className="text-muted-foreground text-sm">
            Monthly comparison over time
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
        {/* Summary Stats */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-xs font-medium uppercase">
              Total Income
            </p>
            <p className="text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatMoney(report.totalIncomeCents)}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-xs font-medium uppercase">
              Total Expenses
            </p>
            <p className="text-lg font-semibold tabular-nums text-red-600 dark:text-red-400">
              {formatMoney(report.totalExpensesCents)}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-xs font-medium uppercase">
              {netLabel}
            </p>
            <p
              className={`text-lg font-semibold tabular-nums ${
                netStatus === 'surplus'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {formatMoney(report.totalSurplusCents)}
            </p>
          </div>
        </div>

        {/* Bar Chart */}
        <ChartContainer
          config={chartConfig}
          className="h-[300px] w-full"
          role="img"
          aria-label="Bar chart comparing monthly income and expenses"
        >
          <BarChart data={chartData} accessibilityLayer>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
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
                    const dollars = typeof value === 'number' ? value : Number(value);
                    return `${formatMoney(Math.round(dollars * 100) as Cents)}`;
                  }}
                />
              }
            />
            <Legend />
            <Bar
              dataKey="income"
              fill="var(--color-income)"
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
            />
            <Bar
              dataKey="expenses"
              fill="var(--color-expenses)"
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
            />
          </BarChart>
        </ChartContainer>

        {/* Data Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left font-medium">Month</th>
                <th className="py-2 text-right font-medium">Income</th>
                <th className="py-2 text-right font-medium">Expenses</th>
                <th className="py-2 text-right font-medium">Net</th>
              </tr>
            </thead>
            <tbody>
              {report.data.map((item) => (
                <tr key={item.yearMonth} className="border-b last:border-0">
                  <td className="py-2">{item.label}</td>
                  <td className="py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatMoney(item.incomeCents)}
                  </td>
                  <td className="py-2 text-right tabular-nums text-red-600 dark:text-red-400">
                    {formatMoney(item.expensesCents)}
                  </td>
                  <td
                    className={`py-2 text-right tabular-nums ${
                      item.surplusCents >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {formatMoney(item.surplusCents)}
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
