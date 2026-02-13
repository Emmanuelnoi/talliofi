import { planRepo } from '@/data/repos/plan-repo';
import { bucketRepo } from '@/data/repos/bucket-repo';
import { taxComponentRepo } from '@/data/repos/tax-component-repo';
import { expenseRepo } from '@/data/repos/expense-repo';
import { snapshotRepo } from '@/data/repos/snapshot-repo';
import { addMoney, cents, formatMoney, normalizeToMonthly } from '@/domain';
import { DEFAULT_CURRENCY } from '@/domain/money';
import { escapeCSVValue } from '@/lib/csv';
import type {
  Plan,
  BucketAllocation,
  TaxComponent,
  ExpenseItem,
} from '@/domain';

const EXPORT_VERSION = 1;

/**
 * Fetches all data for the given plan and serializes it
 * as a versioned JSON string suitable for file download.
 */
export async function exportData(planId: string): Promise<string> {
  const plan = await planRepo.getById(planId);
  if (!plan) {
    throw new Error(`Plan not found: ${planId}`);
  }

  const [buckets, taxComponents, expenses, snapshots] = await Promise.all([
    bucketRepo.getByPlanId(planId),
    taxComponentRepo.getByPlanId(planId),
    expenseRepo.getByPlanId(planId),
    snapshotRepo.getByPlanId(planId),
  ]);

  const payload = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    plan,
    buckets,
    taxComponents,
    expenses,
    snapshots,
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Helper to trigger a file download in the browser.
 * Creates an ephemeral anchor element and handles cleanup.
 */
function triggerDownload(blob: Blob, filename: string): void {
  if (!document.body) {
    throw new Error('Document body not available for download');
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();

  // Use requestAnimationFrame for more reliable cleanup timing
  requestAnimationFrame(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  });
}

/**
 * Creates a Blob from the JSON string and triggers a file download
 * in the browser via an ephemeral anchor element.
 */
export function downloadAsFile(json: string, filename: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  triggerDownload(blob, filename);
}

// --- CSV Export ---

interface ExportData {
  plan: Plan;
  buckets: BucketAllocation[];
  taxComponents: TaxComponent[];
  expenses: ExpenseItem[];
}

async function getExportData(planId: string): Promise<ExportData> {
  const plan = await planRepo.getById(planId);
  if (!plan) {
    throw new Error(`Plan not found: ${planId}`);
  }

  const [buckets, taxComponents, expenses] = await Promise.all([
    bucketRepo.getByPlanId(planId),
    taxComponentRepo.getByPlanId(planId),
    expenseRepo.getByPlanId(planId),
  ]);

  return { plan, buckets, taxComponents, expenses };
}

/**
 * Exports financial data as CSV format.
 * Creates multiple sections for plan info, buckets, and expenses.
 */
export async function exportAsCSV(planId: string): Promise<string> {
  const { plan, buckets, taxComponents, expenses } =
    await getExportData(planId);
  const baseCurrency = plan.currencyCode ?? DEFAULT_CURRENCY;

  const lines: string[] = [];

  // Plan Summary Section
  lines.push('=== PLAN SUMMARY ===');
  lines.push('Field,Value');
  lines.push(`Plan Name,${escapeCSVValue(plan.name)}`);
  lines.push(
    `Gross Income,${formatMoney(plan.grossIncomeCents, {
      currency: baseCurrency,
    })}`,
  );
  lines.push(`Income Frequency,${escapeCSVValue(plan.incomeFrequency)}`);
  lines.push(`Tax Mode,${escapeCSVValue(plan.taxMode)}`);
  if (plan.taxMode === 'simple' && plan.taxEffectiveRate !== undefined) {
    lines.push(`Effective Tax Rate,${plan.taxEffectiveRate}%`);
  }
  lines.push(`Created,${new Date(plan.createdAt).toLocaleDateString()}`);
  lines.push(`Last Updated,${new Date(plan.updatedAt).toLocaleDateString()}`);
  lines.push('');

  // Tax Components Section (if itemized)
  if (taxComponents.length > 0) {
    lines.push('=== TAX COMPONENTS ===');
    lines.push('Name,Rate (%)');
    for (const tax of taxComponents) {
      lines.push(`${escapeCSVValue(tax.name)},${tax.ratePercent}`);
    }
    lines.push('');
  }

  // Buckets Section
  lines.push('=== BUDGET BUCKETS ===');
  lines.push('Name,Color,Mode,Target Percentage,Target Amount');
  for (const bucket of buckets) {
    const targetPct =
      bucket.targetPercentage !== undefined
        ? `${bucket.targetPercentage}%`
        : '';
    const targetAmt =
      bucket.targetAmountCents !== undefined
        ? formatMoney(bucket.targetAmountCents, { currency: baseCurrency })
        : '';
    lines.push(
      `${escapeCSVValue(bucket.name)},${bucket.color},${bucket.mode},${targetPct},${targetAmt}`,
    );
  }
  lines.push('');

  // Expenses Section
  lines.push('=== EXPENSES ===');
  lines.push('Name,Amount,Frequency,Category,Bucket,Fixed,Notes,Created');

  const bucketMap = new Map(buckets.map((b) => [b.id, b.name]));
  for (const expense of expenses) {
    const bucketName = bucketMap.get(expense.bucketId) || 'Unknown';
    const expenseCurrency = expense.currencyCode ?? baseCurrency;
    lines.push(
      [
        escapeCSVValue(expense.name),
        escapeCSVValue(
          formatMoney(expense.amountCents, { currency: expenseCurrency }),
        ),
        escapeCSVValue(expense.frequency),
        escapeCSVValue(expense.category),
        escapeCSVValue(bucketName),
        expense.isFixed ? 'Yes' : 'No',
        escapeCSVValue(expense.notes || ''),
        escapeCSVValue(new Date(expense.createdAt).toLocaleDateString()),
      ].join(','),
    );
  }

  return lines.join('\n');
}

export function downloadAsCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename);
}

// --- PDF Export ---

function formatCategoryName(category: string): string {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generates a PDF report of the financial data.
 */
export async function exportAsPDF(planId: string): Promise<Blob> {
  const { plan, buckets, taxComponents, expenses } =
    await getExportData(planId);
  const baseCurrency = plan.currencyCode ?? DEFAULT_CURRENCY;
  const bucketMap = new Map(buckets.map((b) => [b.id, b.name]));
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const addNewPageIfNeeded = (requiredSpace: number) => {
    if (y + requiredSpace > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Talliofi Financial Report', pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, y, {
    align: 'center',
  });
  y += 15;

  // Plan Summary
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Plan Summary', margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const summaryItems = [
    ['Plan Name:', plan.name],
    [
      'Gross Income:',
      `${formatMoney(plan.grossIncomeCents, {
        currency: baseCurrency,
      })} (${plan.incomeFrequency})`,
    ],
    [
      'Tax Mode:',
      plan.taxMode === 'simple'
        ? `Simple (${plan.taxEffectiveRate}%)`
        : 'Itemized',
    ],
  ];

  for (const [label, value] of summaryItems) {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 35, y);
    y += 6;
  }
  y += 5;

  // Tax Components (if itemized)
  if (taxComponents.length > 0) {
    addNewPageIfNeeded(30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Tax Components', margin, y);
    y += 8;

    doc.setFontSize(10);
    for (const tax of taxComponents) {
      doc.setFont('helvetica', 'normal');
      doc.text(`• ${tax.name}: ${tax.ratePercent}%`, margin + 5, y);
      y += 5;
    }
    y += 5;
  }

  // Budget Buckets
  addNewPageIfNeeded(30);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Budget Buckets', margin, y);
  y += 8;

  doc.setFontSize(10);
  for (const bucket of buckets) {
    addNewPageIfNeeded(10);
    const target =
      bucket.mode === 'percentage'
        ? `${bucket.targetPercentage ?? 0}%`
        : bucket.targetAmountCents !== undefined
          ? formatMoney(bucket.targetAmountCents, { currency: baseCurrency })
          : 'N/A';
    doc.setFont('helvetica', 'normal');
    doc.text(`• ${bucket.name}: ${target} (${bucket.mode})`, margin + 5, y);
    y += 5;
  }
  y += 10;

  // Expenses
  addNewPageIfNeeded(40);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Expenses', margin, y);
  y += 8;

  if (expenses.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('No expenses recorded.', margin + 5, y);
    y += 10;
  } else {
    // Table header
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const colWidths = [50, 30, 30, 35, 35];
    const headers = ['Name', 'Amount', 'Frequency', 'Category', 'Bucket'];
    let x = margin;
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], x, y);
      x += colWidths[i];
    }
    y += 2;

    // Header line
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + contentWidth, y);
    y += 5;

    // Table rows
    doc.setFont('helvetica', 'normal');
    for (const expense of expenses) {
      addNewPageIfNeeded(8);
      x = margin;
      const bucketName = bucketMap.get(expense.bucketId) || 'Unknown';
      const expenseCurrency = expense.currencyCode ?? baseCurrency;
      const row = [
        expense.name.length > 20
          ? expense.name.slice(0, 18) + '...'
          : expense.name,
        formatMoney(expense.amountCents, { currency: expenseCurrency }),
        expense.frequency,
        formatCategoryName(expense.category),
        bucketName.length > 15 ? bucketName.slice(0, 13) + '...' : bucketName,
      ];
      for (let i = 0; i < row.length; i++) {
        doc.text(row[i], x, y);
        x += colWidths[i];
      }
      y += 6;
    }

    // Total
    y += 3;
    addNewPageIfNeeded(10);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + contentWidth, y);
    y += 5;

    // Normalize all expenses to monthly amounts for accurate total
    const totalMonthlyExpenses = expenses.reduce(
      (sum, expense) =>
        addMoney(
          sum,
          normalizeToMonthly(expense.amountCents, expense.frequency),
        ),
      cents(0),
    );
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Total Monthly Expenses: ${formatMoney(totalMonthlyExpenses, {
        currency: baseCurrency,
      })}`,
      margin,
      y,
    );
  }

  // Footer
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' },
    );
  }

  return doc.output('blob');
}

export function downloadAsPDF(blob: Blob, filename: string): void {
  triggerDownload(blob, filename);
}
