import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { formatMoney } from '@/domain/money';
import { CATEGORY_LABELS, FREQUENCY_LABELS } from '@/lib/constants';
import type {
  SpendingByCategoryReport,
  IncomeVsExpensesReport,
  BudgetAdherenceReport,
  CategoryTrendsReport,
  TopExpensesReport,
  DateRange,
} from '../types';
import { formatDateRange } from './report-calculations';

/**
 * Escapes a value for safe CSV output.
 * Prevents CSV injection by prefixing dangerous characters.
 */
function escapeCSVValue(value: string | number | boolean): string {
  const str = String(value);
  const dangerousChars = ['=', '+', '-', '@', '\t', '\r'];
  const needsPrefix = dangerousChars.some((char) => str.startsWith(char));
  const sanitized = needsPrefix ? `'${str}` : str;

  if (
    sanitized.includes(',') ||
    sanitized.includes('"') ||
    sanitized.includes('\n')
  ) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}

/**
 * Triggers a file download in the browser.
 */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  requestAnimationFrame(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  });
}

// --- CSV Export Functions ---

export function exportSpendingByCategoryCSV(
  report: SpendingByCategoryReport,
): string {
  const lines: string[] = [];

  lines.push('Spending by Category Report');
  lines.push(`Date Range: ${formatDateRange(report.dateRange)}`);
  lines.push(`Total: ${formatMoney(report.totalCents)}`);
  lines.push('');
  lines.push('Category,Amount,Percentage,Expense Count');

  for (const item of report.data) {
    lines.push(
      [
        escapeCSVValue(item.label),
        escapeCSVValue(formatMoney(item.totalCents)),
        `${item.percentage.toFixed(1)}%`,
        item.expenseCount.toString(),
      ].join(','),
    );
  }

  return lines.join('\n');
}

export function exportIncomeVsExpensesCSV(
  report: IncomeVsExpensesReport,
): string {
  const lines: string[] = [];

  lines.push('Income vs Expenses Report');
  lines.push(`Date Range: ${formatDateRange(report.dateRange)}`);
  lines.push(
    `Total Income: ${formatMoney(report.totalIncomeCents)}, Total Expenses: ${formatMoney(report.totalExpensesCents)}, Net: ${formatMoney(report.totalSurplusCents)}`,
  );
  lines.push('');
  lines.push('Month,Net Income,Expenses,Surplus/Deficit');

  for (const item of report.data) {
    lines.push(
      [
        escapeCSVValue(item.label),
        escapeCSVValue(formatMoney(item.incomeCents)),
        escapeCSVValue(formatMoney(item.expensesCents)),
        escapeCSVValue(formatMoney(item.surplusCents)),
      ].join(','),
    );
  }

  return lines.join('\n');
}

export function exportBudgetAdherenceCSV(
  report: BudgetAdherenceReport,
): string {
  const lines: string[] = [];

  lines.push('Budget Adherence Report');
  lines.push(`Date Range: ${formatDateRange(report.dateRange)}`);
  lines.push(
    `Overall Adherence: ${report.overallAdherencePercent.toFixed(1)}%`,
  );
  lines.push('');
  lines.push('Bucket,Target,Actual,Variance,Adherence,Status');

  for (const item of report.data) {
    lines.push(
      [
        escapeCSVValue(item.bucketName),
        escapeCSVValue(formatMoney(item.targetCents)),
        escapeCSVValue(formatMoney(item.actualCents)),
        escapeCSVValue(formatMoney(item.varianceCents)),
        `${item.adherencePercent.toFixed(1)}%`,
        item.status.replace('_', ' '),
      ].join(','),
    );
  }

  return lines.join('\n');
}

export function exportCategoryTrendsCSV(report: CategoryTrendsReport): string {
  const lines: string[] = [];

  lines.push('Category Trends Report');
  lines.push(`Date Range: ${formatDateRange(report.dateRange)}`);
  lines.push('');

  // Header row with months
  const headers = ['Category', ...report.months.map((m) => m)];
  lines.push(headers.join(','));

  for (const trend of report.trends) {
    const row = [
      escapeCSVValue(trend.label),
      ...trend.dataPoints.map((p) =>
        escapeCSVValue(formatMoney(p.amountCents)),
      ),
    ];
    lines.push(row.join(','));
  }

  return lines.join('\n');
}

export function exportTopExpensesCSV(report: TopExpensesReport): string {
  const lines: string[] = [];

  lines.push('Top Expenses Report');
  lines.push(`Date Range: ${formatDateRange(report.dateRange)}`);
  lines.push(`Total: ${formatMoney(report.totalCents)}`);
  lines.push('');
  lines.push('Name,Amount,Frequency,Monthly Amount,Category,Bucket,Date');

  for (const item of report.data) {
    const { expense, bucket } = item;
    lines.push(
      [
        escapeCSVValue(expense.name),
        escapeCSVValue(formatMoney(expense.amountCents)),
        escapeCSVValue(FREQUENCY_LABELS[expense.frequency]),
        escapeCSVValue(formatMoney(item.monthlyAmountCents)),
        escapeCSVValue(CATEGORY_LABELS[expense.category]),
        escapeCSVValue(bucket?.name ?? 'Unknown'),
        escapeCSVValue(
          expense.transactionDate ?? expense.createdAt.split('T')[0],
        ),
      ].join(','),
    );
  }

  return lines.join('\n');
}

export function downloadReportCSV(csv: string, reportName: string): void {
  const timestamp = format(new Date(), 'yyyy-MM-dd');
  const filename = `talliofi-${reportName}-${timestamp}.csv`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename);
}

// --- PDF Export Functions ---

interface PDFContext {
  doc: jsPDF;
  y: number;
  margin: number;
  pageWidth: number;
  contentWidth: number;
}

function createPDFContext(): PDFContext {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  return {
    doc,
    y: margin,
    margin,
    pageWidth,
    contentWidth: pageWidth - margin * 2,
  };
}

function addNewPageIfNeeded(ctx: PDFContext, requiredSpace: number): void {
  if (
    ctx.y + requiredSpace >
    ctx.doc.internal.pageSize.getHeight() - ctx.margin
  ) {
    ctx.doc.addPage();
    ctx.y = ctx.margin;
  }
}

function addReportHeader(
  ctx: PDFContext,
  title: string,
  dateRange: DateRange,
): void {
  ctx.doc.setFontSize(18);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.text(title, ctx.pageWidth / 2, ctx.y, { align: 'center' });
  ctx.y += 8;

  ctx.doc.setFontSize(10);
  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.text(formatDateRange(dateRange), ctx.pageWidth / 2, ctx.y, {
    align: 'center',
  });
  ctx.y += 6;

  ctx.doc.text(
    `Generated: ${format(new Date(), 'PPP')}`,
    ctx.pageWidth / 2,
    ctx.y,
    { align: 'center' },
  );
  ctx.y += 12;
}

function addPageNumbers(doc: jsPDF): void {
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' },
    );
  }
}

export function exportSpendingByCategoryPDF(
  report: SpendingByCategoryReport,
): Blob {
  const ctx = createPDFContext();

  addReportHeader(ctx, 'Spending by Category', report.dateRange);

  // Summary
  ctx.doc.setFontSize(12);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.text(
    `Total Spending: ${formatMoney(report.totalCents)}`,
    ctx.margin,
    ctx.y,
  );
  ctx.y += 10;

  // Table header
  addNewPageIfNeeded(ctx, 30);
  ctx.doc.setFontSize(10);
  ctx.doc.setFont('helvetica', 'bold');
  const colWidths = [70, 40, 30, 30];
  const headers = ['Category', 'Amount', '%', 'Count'];
  let x = ctx.margin;
  for (let i = 0; i < headers.length; i++) {
    ctx.doc.text(headers[i], x, ctx.y);
    x += colWidths[i];
  }
  ctx.y += 2;
  ctx.doc.setLineWidth(0.5);
  ctx.doc.line(ctx.margin, ctx.y, ctx.margin + ctx.contentWidth, ctx.y);
  ctx.y += 5;

  // Table rows
  ctx.doc.setFont('helvetica', 'normal');
  for (const item of report.data) {
    addNewPageIfNeeded(ctx, 8);
    x = ctx.margin;
    const row = [
      item.label,
      formatMoney(item.totalCents),
      `${item.percentage.toFixed(1)}%`,
      item.expenseCount.toString(),
    ];
    for (let i = 0; i < row.length; i++) {
      ctx.doc.text(row[i], x, ctx.y);
      x += colWidths[i];
    }
    ctx.y += 6;
  }

  addPageNumbers(ctx.doc);
  return ctx.doc.output('blob');
}

export function exportIncomeVsExpensesPDF(
  report: IncomeVsExpensesReport,
): Blob {
  const ctx = createPDFContext();

  addReportHeader(ctx, 'Income vs Expenses', report.dateRange);

  // Summary
  ctx.doc.setFontSize(10);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.text(
    `Total Income: ${formatMoney(report.totalIncomeCents)}`,
    ctx.margin,
    ctx.y,
  );
  ctx.y += 6;
  ctx.doc.text(
    `Total Expenses: ${formatMoney(report.totalExpensesCents)}`,
    ctx.margin,
    ctx.y,
  );
  ctx.y += 6;
  const netLabel =
    report.totalSurplusCents >= 0 ? 'Net Surplus' : 'Net Deficit';
  ctx.doc.text(
    `${netLabel}: ${formatMoney(report.totalSurplusCents)}`,
    ctx.margin,
    ctx.y,
  );
  ctx.y += 12;

  // Table
  ctx.doc.setFontSize(10);
  ctx.doc.setFont('helvetica', 'bold');
  const colWidths = [50, 35, 35, 35];
  const headers = ['Month', 'Income', 'Expenses', 'Net'];
  let x = ctx.margin;
  for (let i = 0; i < headers.length; i++) {
    ctx.doc.text(headers[i], x, ctx.y);
    x += colWidths[i];
  }
  ctx.y += 2;
  ctx.doc.setLineWidth(0.5);
  ctx.doc.line(ctx.margin, ctx.y, ctx.margin + ctx.contentWidth, ctx.y);
  ctx.y += 5;

  ctx.doc.setFont('helvetica', 'normal');
  for (const item of report.data) {
    addNewPageIfNeeded(ctx, 8);
    x = ctx.margin;
    const row = [
      item.label,
      formatMoney(item.incomeCents),
      formatMoney(item.expensesCents),
      formatMoney(item.surplusCents),
    ];
    for (let i = 0; i < row.length; i++) {
      ctx.doc.text(row[i], x, ctx.y);
      x += colWidths[i];
    }
    ctx.y += 6;
  }

  addPageNumbers(ctx.doc);
  return ctx.doc.output('blob');
}

export function exportBudgetAdherencePDF(report: BudgetAdherenceReport): Blob {
  const ctx = createPDFContext();

  addReportHeader(ctx, 'Budget Adherence', report.dateRange);

  // Summary
  ctx.doc.setFontSize(12);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.text(
    `Overall Adherence: ${report.overallAdherencePercent.toFixed(1)}%`,
    ctx.margin,
    ctx.y,
  );
  ctx.y += 12;

  // Table
  ctx.doc.setFontSize(9);
  ctx.doc.setFont('helvetica', 'bold');
  const colWidths = [45, 30, 30, 30, 25, 25];
  const headers = ['Bucket', 'Target', 'Actual', 'Variance', '%', 'Status'];
  let x = ctx.margin;
  for (let i = 0; i < headers.length; i++) {
    ctx.doc.text(headers[i], x, ctx.y);
    x += colWidths[i];
  }
  ctx.y += 2;
  ctx.doc.setLineWidth(0.5);
  ctx.doc.line(ctx.margin, ctx.y, ctx.margin + ctx.contentWidth, ctx.y);
  ctx.y += 5;

  ctx.doc.setFont('helvetica', 'normal');
  for (const item of report.data) {
    addNewPageIfNeeded(ctx, 8);
    x = ctx.margin;
    const row = [
      item.bucketName.length > 18
        ? item.bucketName.slice(0, 16) + '...'
        : item.bucketName,
      formatMoney(item.targetCents),
      formatMoney(item.actualCents),
      formatMoney(item.varianceCents),
      `${item.adherencePercent.toFixed(0)}%`,
      item.status.replace('_', ' '),
    ];
    for (let i = 0; i < row.length; i++) {
      ctx.doc.text(row[i], x, ctx.y);
      x += colWidths[i];
    }
    ctx.y += 6;
  }

  addPageNumbers(ctx.doc);
  return ctx.doc.output('blob');
}

export function exportCategoryTrendsPDF(report: CategoryTrendsReport): Blob {
  const ctx = createPDFContext();

  addReportHeader(ctx, 'Category Trends', report.dateRange);

  // Note about the chart
  ctx.doc.setFontSize(10);
  ctx.doc.setFont('helvetica', 'italic');
  ctx.doc.text(
    'Monthly spending by category (view full charts in the app)',
    ctx.margin,
    ctx.y,
  );
  ctx.y += 12;

  // Table for each category
  for (const trend of report.trends) {
    addNewPageIfNeeded(ctx, 25);

    ctx.doc.setFontSize(11);
    ctx.doc.setFont('helvetica', 'bold');
    ctx.doc.text(trend.label, ctx.margin, ctx.y);
    ctx.y += 6;

    ctx.doc.setFontSize(9);
    ctx.doc.setFont('helvetica', 'normal');
    const values = trend.dataPoints
      .map((p) => `${p.label}: ${formatMoney(p.amountCents)}`)
      .join('  |  ');

    // Wrap text if needed
    const splitText = ctx.doc.splitTextToSize(values, ctx.contentWidth);
    ctx.doc.text(splitText, ctx.margin, ctx.y);
    ctx.y += splitText.length * 4 + 6;
  }

  addPageNumbers(ctx.doc);
  return ctx.doc.output('blob');
}

export function exportTopExpensesPDF(report: TopExpensesReport): Blob {
  const ctx = createPDFContext();

  addReportHeader(ctx, 'Top Expenses', report.dateRange);

  // Summary
  ctx.doc.setFontSize(12);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.text(
    `Total (Top ${report.data.length}): ${formatMoney(report.totalCents)}`,
    ctx.margin,
    ctx.y,
  );
  ctx.y += 12;

  // Table
  ctx.doc.setFontSize(9);
  ctx.doc.setFont('helvetica', 'bold');
  const colWidths = [50, 35, 40, 40];
  const headers = ['Name', 'Monthly Amt', 'Category', 'Bucket'];
  let x = ctx.margin;
  for (let i = 0; i < headers.length; i++) {
    ctx.doc.text(headers[i], x, ctx.y);
    x += colWidths[i];
  }
  ctx.y += 2;
  ctx.doc.setLineWidth(0.5);
  ctx.doc.line(ctx.margin, ctx.y, ctx.margin + ctx.contentWidth, ctx.y);
  ctx.y += 5;

  ctx.doc.setFont('helvetica', 'normal');
  for (const item of report.data) {
    addNewPageIfNeeded(ctx, 8);
    x = ctx.margin;
    const row = [
      item.expense.name.length > 22
        ? item.expense.name.slice(0, 20) + '...'
        : item.expense.name,
      formatMoney(item.monthlyAmountCents),
      CATEGORY_LABELS[item.expense.category],
      item.bucket?.name ?? 'Unknown',
    ];
    for (let i = 0; i < row.length; i++) {
      const text = row[i].length > 18 ? row[i].slice(0, 16) + '...' : row[i];
      ctx.doc.text(text, x, ctx.y);
      x += colWidths[i];
    }
    ctx.y += 6;
  }

  addPageNumbers(ctx.doc);
  return ctx.doc.output('blob');
}

export function downloadReportPDF(blob: Blob, reportName: string): void {
  const timestamp = format(new Date(), 'yyyy-MM-dd');
  const filename = `talliofi-${reportName}-${timestamp}.pdf`;
  triggerDownload(blob, filename);
}
