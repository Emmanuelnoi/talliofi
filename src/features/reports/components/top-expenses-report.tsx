import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Receipt,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney } from '@/domain/money';
import { CATEGORY_LABELS, FREQUENCY_LABELS } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/feedback/empty-state';
import type { TopExpensesReport as ReportData } from '../types';
import {
  exportTopExpensesCSV,
  exportTopExpensesPDF,
  downloadReportCSV,
  downloadReportPDF,
} from '../utils/report-export';

interface TopExpensesReportProps {
  report: ReportData | null;
}

export function TopExpensesReport({ report }: TopExpensesReportProps) {
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);

  const handleExport = async (formatType: 'csv' | 'pdf') => {
    if (!report) return;
    setExporting(formatType);

    try {
      if (formatType === 'csv') {
        const csv = exportTopExpensesCSV(report);
        downloadReportCSV(csv, 'top-expenses');
        toast.success('CSV exported successfully');
      } else {
        const blob = exportTopExpensesPDF(report);
        downloadReportPDF(blob, 'top-expenses');
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
          <CardTitle>Top Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Receipt}
            title="No expenses"
            description="No expenses found in this date range."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="print:shadow-none print:break-inside-avoid">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Top Expenses</CardTitle>
          <p className="text-muted-foreground text-sm">
            Top {report.data.length} expenses by monthly amount
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
        {/* Summary */}
        <div className="mb-4 rounded-lg border p-3">
          <p className="text-muted-foreground text-sm">
            Total (Top {report.data.length}):
          </p>
          <p className="text-2xl font-bold tabular-nums">
            {formatMoney(report.totalCents)}
          </p>
          <p className="text-muted-foreground text-xs">per month</p>
        </div>

        {/* Expense List */}
        <div className="space-y-3">
          {report.data.map((item, index) => {
            const { expense, bucket, monthlyAmountCents } = item;
            const dateStr =
              expense.transactionDate ?? expense.createdAt.split('T')[0];
            const formattedDate = format(parseISO(dateStr), 'MMM d, yyyy');
            const showNormalized = expense.frequency !== 'monthly';

            return (
              <div
                key={expense.id}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
                {/* Rank */}
                <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                  {index + 1}
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {bucket && (
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: bucket.color }}
                        aria-hidden="true"
                      />
                    )}
                    <span className="truncate font-medium">{expense.name}</span>
                    <Badge
                      variant={expense.isFixed ? 'secondary' : 'outline'}
                      className="shrink-0 text-xs"
                    >
                      {expense.isFixed ? 'Fixed' : 'Variable'}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                    <span>{CATEGORY_LABELS[expense.category]}</span>
                    {bucket && (
                      <>
                        <span aria-hidden="true">|</span>
                        <span>{bucket.name}</span>
                      </>
                    )}
                    <span aria-hidden="true">|</span>
                    <span>{formattedDate}</span>
                  </div>
                </div>

                {/* Amount */}
                <div className="shrink-0 text-right">
                  <div className="font-medium tabular-nums">
                    {formatMoney(monthlyAmountCents)}
                    <span className="text-muted-foreground text-xs">/mo</span>
                  </div>
                  {showNormalized && (
                    <div className="text-muted-foreground text-xs tabular-nums">
                      {formatMoney(expense.amountCents)}{' '}
                      {FREQUENCY_LABELS[expense.frequency].toLowerCase()}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Screen reader summary */}
        <div className="sr-only">
          <h4>Top Expenses List</h4>
          <ol>
            {report.data.map((item, index) => (
              <li key={item.expense.id}>
                {index + 1}. {item.expense.name}:{' '}
                {formatMoney(item.monthlyAmountCents)} per month (
                {CATEGORY_LABELS[item.expense.category]})
              </li>
            ))}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
