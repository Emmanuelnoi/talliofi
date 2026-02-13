/**
 * Import Transactions Section
 *
 * Allows users to import transactions from CSV and OFX/QFX bank export files.
 * Features file upload, column mapping for CSV, preview table, and bucket assignment.
 */

import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Upload,
  FileSpreadsheet,
  Building2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  HelpCircle,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

import { useActivePlan } from '@/hooks/use-active-plan';
import { useBuckets, useExpenses } from '@/hooks/use-plan-data';
import { useLocalEncryption } from '@/hooks/use-local-encryption';
import { expenseRepo } from '@/data/repos/expense-repo';
import { DEFAULT_CURRENCY, formatMoney, cents } from '@/domain/money';
import type { Cents, CurrencyCode } from '@/domain/money';
import type { ExpenseCategory, BucketAllocation } from '@/domain/plan/types';

import {
  parseFile,
  createImportPreview,
  convertToExpenseItems,
  detectDelimiter,
  detectColumnMapping,
  type ImportableTransaction,
  type ImportPreview,
  type ColumnMapping,
  type CsvDelimiter,
  type DateFormat,
  type CsvParseOptions,
} from '@/data/import/transaction-import-service';

// ============================================================================
// Types
// ============================================================================

interface FileState {
  file: File | null;
  content: string | null;
  error: string | null;
}

type ImportStep = 'upload' | 'configure' | 'preview' | 'complete';

interface ImportState {
  step: ImportStep;
  fileState: FileState;
  preview: ImportPreview | null;
  csvOptions: CsvParseOptions;
  detectedHeaders: string[] | null;
  selectedBucketId: string;
  isImporting: boolean;
  importedCount: number;
}

// ============================================================================
// Constants
// ============================================================================

const ACCEPTED_FILE_TYPES = '.csv,.ofx,.qfx';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const DATE_FORMAT_OPTIONS: Array<{ value: DateFormat; label: string }> = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (EU)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
];

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  housing: 'Housing',
  utilities: 'Utilities',
  transportation: 'Transportation',
  groceries: 'Groceries',
  healthcare: 'Healthcare',
  insurance: 'Insurance',
  debt_payment: 'Debt Payment',
  savings: 'Savings',
  entertainment: 'Entertainment',
  dining: 'Dining',
  personal: 'Personal',
  subscriptions: 'Subscriptions',
  other: 'Other',
};

// ============================================================================
// Utility Functions
// ============================================================================

function getInitialState(defaultBucketId: string): ImportState {
  return {
    step: 'upload',
    fileState: { file: null, content: null, error: null },
    preview: null,
    csvOptions: {
      delimiter: undefined,
      dateFormat: 'auto',
      hasHeader: true,
      treatPositiveAsExpense: false,
    },
    detectedHeaders: null,
    selectedBucketId: defaultBucketId,
    isImporting: false,
    importedCount: 0,
  };
}

// ============================================================================
// Sub-Components
// ============================================================================

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
  error: string | null;
}

function FileDropzone({
  onFileSelect,
  isProcessing,
  error,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect],
  );

  return (
    <div className="space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8
          transition-colors
          ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          ${isProcessing ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:border-primary/50'}
        `}
      >
        <input
          type="file"
          accept={ACCEPTED_FILE_TYPES}
          onChange={handleInputChange}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Select file to import"
          disabled={isProcessing}
        />
        {isProcessing ? (
          <Loader2 className="size-10 motion-safe:animate-spin text-muted-foreground" />
        ) : (
          <Upload className="size-10 text-muted-foreground" />
        )}
        <div className="text-center">
          <p className="text-sm font-medium">
            {isProcessing
              ? 'Processing file…'
              : 'Drop file here or click to browse'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Supports CSV, OFX, and QFX files (max 10 MB)
          </p>
        </div>
      </div>

      {error && (
        <div
          className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}

interface CsvConfigurationProps {
  headers: string[];
  options: CsvParseOptions;
  onOptionsChange: (options: CsvParseOptions) => void;
}

function CsvConfiguration({
  headers,
  options,
  onOptionsChange,
}: CsvConfigurationProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
    const columnIndex = parseInt(value, 10);
    const base = {
      date: options.columnMapping?.date ?? 0,
      description: options.columnMapping?.description ?? 1,
      amount: options.columnMapping?.amount ?? 2,
      category: options.columnMapping?.category,
    };

    const newMapping: ColumnMapping =
      field === 'category'
        ? { ...base, category: columnIndex >= 0 ? columnIndex : undefined }
        : field === 'date'
          ? { ...base, date: columnIndex }
          : field === 'description'
            ? { ...base, description: columnIndex }
            : { ...base, amount: columnIndex };

    onOptionsChange({ ...options, columnMapping: newMapping });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/30 p-4">
        <p className="mb-3 text-sm font-medium">Column Mapping</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="date-column" className="text-xs">
              Date Column
            </Label>
            <Select
              value={String(options.columnMapping?.date ?? 0)}
              onValueChange={(v) => handleMappingChange('date', v)}
            >
              <SelectTrigger id="date-column" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {headers.map((header, idx) => (
                  <SelectItem key={idx} value={String(idx)}>
                    {header || `Column ${idx + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="description-column" className="text-xs">
              Description Column
            </Label>
            <Select
              value={String(options.columnMapping?.description ?? 1)}
              onValueChange={(v) => handleMappingChange('description', v)}
            >
              <SelectTrigger id="description-column" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {headers.map((header, idx) => (
                  <SelectItem key={idx} value={String(idx)}>
                    {header || `Column ${idx + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="amount-column" className="text-xs">
              Amount Column
            </Label>
            <Select
              value={String(options.columnMapping?.amount ?? 2)}
              onValueChange={(v) => handleMappingChange('amount', v)}
            >
              <SelectTrigger id="amount-column" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {headers.map((header, idx) => (
                  <SelectItem key={idx} value={String(idx)}>
                    {header || `Column ${idx + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="category-column" className="text-xs">
              Category Column (Optional)
            </Label>
            <Select
              value={String(options.columnMapping?.category ?? -1)}
              onValueChange={(v) => handleMappingChange('category', v)}
            >
              <SelectTrigger id="category-column" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-1">None</SelectItem>
                {headers.map((header, idx) => (
                  <SelectItem key={idx} value={String(idx)}>
                    {header || `Column ${idx + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between">
            <span>Advanced Options</span>
            {isAdvancedOpen ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="grid gap-3 rounded-md border bg-muted/30 p-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="date-format" className="text-xs">
                Date Format
              </Label>
              <Select
                value={options.dateFormat || 'auto'}
                onValueChange={(v) =>
                  onOptionsChange({ ...options, dateFormat: v as DateFormat })
                }
              >
                <SelectTrigger id="date-format" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMAT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="delimiter" className="text-xs">
                Delimiter
              </Label>
              <Select
                value={options.delimiter || 'auto'}
                onValueChange={(v) =>
                  onOptionsChange({
                    ...options,
                    delimiter: v === 'auto' ? undefined : (v as CsvDelimiter),
                  })
                }
              >
                <SelectTrigger id="delimiter" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect</SelectItem>
                  <SelectItem value=",">Comma (,)</SelectItem>
                  <SelectItem value=";">Semicolon (;)</SelectItem>
                  <SelectItem value={'\t'}>Tab</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                id="treat-positive-as-expense"
                checked={options.treatPositiveAsExpense}
                onChange={(e) =>
                  onOptionsChange({
                    ...options,
                    treatPositiveAsExpense: e.target.checked,
                  })
                }
                className="size-4 rounded border-gray-300"
              />
              <Label
                htmlFor="treat-positive-as-expense"
                className="text-xs font-normal"
              >
                Treat positive amounts as expenses
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="ml-1 inline size-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        Some banks export expenses as positive numbers. Enable
                        this if your expenses appear as income.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

interface TransactionPreviewTableProps {
  transactions: ImportableTransaction[];
  buckets: BucketAllocation[];
  currencyCode: CurrencyCode;
  onTransactionUpdate: (
    index: number,
    updates: Partial<ImportableTransaction>,
  ) => void;
  onSelectAll: (selected: boolean) => void;
}

function TransactionPreviewTable({
  transactions,
  buckets,
  currencyCode,
  onTransactionUpdate,
  onSelectAll,
}: TransactionPreviewTableProps) {
  const [expandedCount, setExpandedCount] = useState(20);

  const visibleTransactions = transactions.slice(0, expandedCount);
  const hasMore = expandedCount < transactions.length;

  const allSelected = transactions.every((t) => t.selected);
  const noneSelected = transactions.every((t) => !t.selected);
  const someSelected = !allSelected && !noneSelected;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="select-all"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected;
            }}
            onChange={(e) => onSelectAll(e.target.checked)}
            className="size-4 rounded border-gray-300"
          />
          <Label htmlFor="select-all" className="text-xs font-normal">
            Select all ({transactions.filter((t) => t.selected).length} of{' '}
            {transactions.length})
          </Label>
        </div>
        <p className="text-xs text-muted-foreground">
          {transactions.filter((t) => t.isDuplicate).length} duplicates found
        </p>
      </div>

      <div className="max-h-96 overflow-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/90 backdrop-blur">
            <tr className="border-b">
              <th className="w-10 p-2 text-left">
                <span className="sr-only">Select</span>
              </th>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Description</th>
              <th className="p-2 text-right">Amount</th>
              <th className="p-2 text-left">Category</th>
              <th className="p-2 text-left">Bucket</th>
              <th className="w-10 p-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {visibleTransactions.map((tx, idx) => (
              <tr
                key={idx}
                className={`border-b transition-colors ${
                  tx.isDuplicate ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''
                } ${!tx.isExpense ? 'opacity-60' : ''}`}
              >
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={tx.selected}
                    onChange={(e) =>
                      onTransactionUpdate(idx, { selected: e.target.checked })
                    }
                    className="size-4 rounded border-gray-300"
                    aria-label={`Select transaction: ${tx.description}`}
                  />
                </td>
                <td className="whitespace-nowrap p-2">{tx.date}</td>
                <td className="max-w-48 truncate p-2" title={tx.description}>
                  {tx.description}
                </td>
                <td className="whitespace-nowrap p-2 text-right font-medium">
                  {tx.isExpense ? '-' : '+'}
                  {formatMoney(tx.amountCents as Cents, {
                    currency: currencyCode,
                  })}
                </td>
                <td className="p-2">
                  <Select
                    value={tx.mappedCategory}
                    onValueChange={(v) =>
                      onTransactionUpdate(idx, {
                        mappedCategory: v as ExpenseCategory,
                      })
                    }
                  >
                    <SelectTrigger size="sm" className="h-7 w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-2">
                  <Select
                    value={tx.bucketId}
                    onValueChange={(v) =>
                      onTransactionUpdate(idx, { bucketId: v })
                    }
                  >
                    <SelectTrigger size="sm" className="h-7 w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {buckets.map((bucket) => (
                        <SelectItem key={bucket.id} value={bucket.id}>
                          <span className="flex items-center gap-2">
                            <span
                              className="inline-block size-3 rounded-full"
                              style={{ backgroundColor: bucket.color }}
                            />
                            {bucket.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-2 text-center">
                  {tx.isDuplicate ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <AlertTriangle className="size-4 text-yellow-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Possible duplicate</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : tx.isExpense ? (
                    <CheckCircle2 className="size-4 text-green-500" />
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <XCircle className="size-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Income (will be skipped)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setExpandedCount((c) => c + 50)}
        >
          Show more ({transactions.length - expandedCount} remaining)
        </Button>
      )}
    </div>
  );
}

interface ImportSummaryProps {
  preview: ImportPreview;
  currencyCode: CurrencyCode;
}

function ImportSummary({ preview, currencyCode }: ImportSummaryProps) {
  const selectedCount = preview.transactions.filter((t) => t.selected).length;
  const totalAmount = preview.transactions
    .filter((t) => t.selected)
    .reduce((sum, t) => sum + t.amountCents, 0);

  return (
    <div className="rounded-md border bg-muted/30 p-4">
      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Total Transactions</p>
          <p className="text-lg font-semibold">{preview.totalCount}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Selected for Import</p>
          <p className="text-lg font-semibold">{selectedCount}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total Amount</p>
          <p className="text-lg font-semibold">
            {formatMoney(cents(totalAmount), { currency: currencyCode })}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Date Range</p>
          <p className="text-sm font-medium">
            {preview.dateRange
              ? `${preview.dateRange.earliest} - ${preview.dateRange.latest}`
              : 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ImportTransactionsSection() {
  const queryClient = useQueryClient();
  const { scheduleVaultSave } = useLocalEncryption();
  const { data: plan } = useActivePlan();
  const { data: buckets = [] } = useBuckets(plan?.id);
  const { data: existingExpenses = [] } = useExpenses(plan?.id);

  const defaultBucketId = buckets[0]?.id ?? '';
  const planCurrency = plan?.currencyCode ?? DEFAULT_CURRENCY;

  const [state, setState] = useState<ImportState>(() =>
    getInitialState(defaultBucketId),
  );

  // Update default bucket when buckets load
  useMemo(() => {
    if (defaultBucketId && !state.selectedBucketId) {
      setState((s) => ({ ...s, selectedBucketId: defaultBucketId }));
    }
  }, [defaultBucketId, state.selectedBucketId]);

  const isCsvFile = state.fileState.file?.name.toLowerCase().endsWith('.csv');

  // --------------------------------
  // File Handling
  // --------------------------------

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (file.size > MAX_FILE_SIZE) {
        setState((s) => ({
          ...s,
          fileState: {
            file: null,
            content: null,
            error: 'File too large. Maximum size is 10 MB.',
          },
        }));
        return;
      }

      setState((s) => ({
        ...s,
        fileState: { file, content: null, error: null },
        step: 'upload',
        preview: null,
      }));

      try {
        const content = await file.text();

        // For CSV files, extract headers and auto-detect options
        let detectedHeaders: string[] | null = null;
        let csvOptions: CsvParseOptions = {
          delimiter: undefined,
          dateFormat: 'auto',
          hasHeader: true,
          treatPositiveAsExpense: false,
        };

        if (file.name.toLowerCase().endsWith('.csv')) {
          const delimiter = detectDelimiter(content);
          const lines = content.split('\n');
          const firstLine = lines[0];
          if (firstLine) {
            const fields = firstLine
              .split(delimiter)
              .map((f) => f.trim().replace(/^"|"$/g, ''));
            detectedHeaders = fields;
            const autoMapping = detectColumnMapping(fields);
            csvOptions = {
              ...csvOptions,
              delimiter,
              columnMapping: autoMapping ?? {
                date: 0,
                description: 1,
                amount: 2,
              },
            };
          }
        }

        setState((s) => ({
          ...s,
          fileState: { file, content, error: null },
          step: file.name.toLowerCase().endsWith('.csv')
            ? 'configure'
            : 'preview',
          detectedHeaders,
          csvOptions,
        }));

        // For non-CSV files, go directly to preview
        if (!file.name.toLowerCase().endsWith('.csv')) {
          const transactions = parseFile(file.name, content);
          const preview = createImportPreview(
            transactions,
            existingExpenses,
            state.selectedBucketId || defaultBucketId,
          );
          setState((s) => ({ ...s, preview, step: 'preview' }));
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to read file';
        setState((s) => ({
          ...s,
          fileState: { file: null, content: null, error: message },
        }));
      }
    },
    [existingExpenses, state.selectedBucketId, defaultBucketId],
  );

  // --------------------------------
  // CSV Configuration
  // --------------------------------

  const handleCsvOptionsChange = useCallback((options: CsvParseOptions) => {
    setState((s) => ({ ...s, csvOptions: options }));
  }, []);

  const handleParseAndPreview = useCallback(() => {
    if (!state.fileState.content || !state.fileState.file) return;

    try {
      const transactions = parseFile(
        state.fileState.file.name,
        state.fileState.content,
        state.csvOptions,
      );
      const preview = createImportPreview(
        transactions,
        existingExpenses,
        state.selectedBucketId || defaultBucketId,
      );
      setState((s) => ({ ...s, preview, step: 'preview' }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to parse file';
      toast.error(message);
    }
  }, [
    state.fileState,
    state.csvOptions,
    existingExpenses,
    state.selectedBucketId,
    defaultBucketId,
  ]);

  // --------------------------------
  // Preview Manipulation
  // --------------------------------

  const handleTransactionUpdate = useCallback(
    (index: number, updates: Partial<ImportableTransaction>) => {
      setState((s) => {
        if (!s.preview) return s;
        const newTransactions = [...s.preview.transactions];
        newTransactions[index] = { ...newTransactions[index], ...updates };
        return {
          ...s,
          preview: { ...s.preview, transactions: newTransactions },
        };
      });
    },
    [],
  );

  const handleSelectAll = useCallback((selected: boolean) => {
    setState((s) => {
      if (!s.preview) return s;
      const newTransactions = s.preview.transactions.map((t) => ({
        ...t,
        selected: selected && t.isExpense && !t.isDuplicate,
      }));
      return {
        ...s,
        preview: { ...s.preview, transactions: newTransactions },
      };
    });
  }, []);

  const handleBucketChange = useCallback((bucketId: string) => {
    setState((s) => {
      const newState = { ...s, selectedBucketId: bucketId };
      if (s.preview) {
        const newTransactions = s.preview.transactions.map((t) => ({
          ...t,
          bucketId,
        }));
        newState.preview = { ...s.preview, transactions: newTransactions };
      }
      return newState;
    });
  }, []);

  // --------------------------------
  // Import Execution
  // --------------------------------

  const handleImport = useCallback(async () => {
    if (!state.preview || !plan) return;

    const selectedTransactions = state.preview.transactions.filter(
      (t) => t.selected,
    );
    if (selectedTransactions.length === 0) {
      toast.error('No transactions selected for import');
      return;
    }

    setState((s) => ({ ...s, isImporting: true }));

    try {
      const expenseItems = convertToExpenseItems(selectedTransactions, {
        planId: plan.id,
        defaultBucketId: state.selectedBucketId || defaultBucketId,
        currencyCode: planCurrency,
      });

      // Import one by one to handle potential errors
      let importedCount = 0;
      for (const item of expenseItems) {
        const id = crypto.randomUUID();
        await expenseRepo.create({ ...item, id });
        importedCount++;
      }

      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      scheduleVaultSave();

      setState((s) => ({
        ...s,
        step: 'complete',
        isImporting: false,
        importedCount,
      }));

      toast.success(`Successfully imported ${importedCount} transactions`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed';
      toast.error(message);
      setState((s) => ({ ...s, isImporting: false }));
    }
  }, [
    state.preview,
    state.selectedBucketId,
    plan,
    defaultBucketId,
    queryClient,
    scheduleVaultSave,
    planCurrency,
  ]);

  // --------------------------------
  // Reset
  // --------------------------------

  const handleReset = useCallback(() => {
    setState(getInitialState(defaultBucketId));
  }, [defaultBucketId]);

  // --------------------------------
  // Render
  // --------------------------------

  if (!plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-5" />
            Import Transactions
          </CardTitle>
          <CardDescription>
            Complete onboarding to import bank transactions.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (buckets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-5" />
            Import Transactions
          </CardTitle>
          <CardDescription>
            Create at least one bucket before importing transactions.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="size-5" />
          Import Transactions
        </CardTitle>
        <CardDescription>
          Import transactions from your bank&apos;s CSV or OFX/QFX export files.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step 1: File Upload */}
        {state.step === 'upload' && (
          <FileDropzone
            onFileSelect={handleFileSelect}
            isProcessing={!!state.fileState.file && !state.fileState.content}
            error={state.fileState.error}
          />
        )}

        {/* Step 2: CSV Configuration */}
        {state.step === 'configure' && isCsvFile && state.detectedHeaders && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {state.fileState.file?.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Configure column mapping
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                Cancel
              </Button>
            </div>

            <CsvConfiguration
              headers={state.detectedHeaders}
              options={state.csvOptions}
              onOptionsChange={handleCsvOptionsChange}
            />

            <div className="flex gap-2">
              <Button onClick={handleParseAndPreview}>
                <FileSpreadsheet className="size-4" />
                Parse & Preview
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {state.step === 'preview' && state.preview && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {state.fileState.file?.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Review and select transactions to import
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                Cancel
              </Button>
            </div>

            {/* Default Bucket Selector */}
            <div className="flex items-center gap-3">
              <Label
                htmlFor="default-bucket"
                className="text-sm whitespace-nowrap"
              >
                <Building2 className="mr-1 inline size-4" />
                Default Bucket:
              </Label>
              <Select
                value={state.selectedBucketId}
                onValueChange={handleBucketChange}
              >
                <SelectTrigger id="default-bucket" className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {buckets.map((bucket) => (
                    <SelectItem key={bucket.id} value={bucket.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block size-3 rounded-full"
                          style={{ backgroundColor: bucket.color }}
                        />
                        {bucket.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ImportSummary
              preview={state.preview}
              currencyCode={planCurrency}
            />

            <TransactionPreviewTable
              transactions={state.preview.transactions}
              buckets={buckets}
              currencyCode={planCurrency}
              onTransactionUpdate={handleTransactionUpdate}
              onSelectAll={handleSelectAll}
            />

            <div className="flex gap-2">
              <Button onClick={handleImport} disabled={state.isImporting}>
                {state.isImporting ? (
                  <Loader2 className="size-4 motion-safe:animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                {state.isImporting
                  ? 'Importing…'
                  : `Import ${state.preview.transactions.filter((t) => t.selected).length} Transactions`}
              </Button>
              {isCsvFile && (
                <Button
                  variant="outline"
                  onClick={() => setState((s) => ({ ...s, step: 'configure' }))}
                >
                  Back to Configuration
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {state.step === 'complete' && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <CheckCircle2 className="size-12 text-green-500" />
            <div>
              <p className="text-lg font-medium">Import Complete!</p>
              <p className="text-sm text-muted-foreground">
                Successfully imported {state.importedCount} transactions.
              </p>
            </div>
            <Button onClick={handleReset}>
              <FileSpreadsheet className="size-4" />
              Import Another File
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
