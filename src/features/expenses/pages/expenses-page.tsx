import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import {
  CalendarIcon,
  ChevronDown,
  ChevronUp,
  Filter,
  Loader2,
  MoreHorizontal,
  Pencil,
  Paperclip,
  Plus,
  Receipt,
  RefreshCw,
  Repeat,
  Search,
  SortAsc,
  Split,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useQueryStates,
  parseAsString,
  parseAsArrayOf,
  parseAsInteger,
} from 'nuqs';
import type { z } from 'zod';
import { ExpenseFormSchema } from '@/domain/plan/schemas';
import {
  type Cents,
  type CurrencyCode,
  dollarsToCents,
  centsToDollars,
  formatMoney,
  cents,
  addMoney,
  SUPPORTED_CURRENCIES,
  DEFAULT_CURRENCY,
  getCurrencySymbol,
} from '@/domain/money';
import { normalizeToMonthly } from '@/domain/plan';
import type {
  ExpenseItem,
  ExpenseSplit,
  BucketAllocation,
  ExpenseCategory,
  Frequency,
} from '@/domain/plan';
import { recurringService } from '@/services/recurring-service';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/feedback/empty-state';
import { MoneyInput } from '@/components/forms/money-input';
import { MultiSelect } from '@/components/forms/multi-select';
import type { MultiSelectOption } from '@/components/forms/multi-select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useActivePlan } from '@/hooks/use-active-plan';
import {
  useBuckets,
  useExpenses,
  useExchangeRates,
  useRecurringTemplates,
  useExpenseAttachments,
} from '@/hooks/use-plan-data';
import {
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useBulkDeleteExpenses,
  useBulkUpdateExpenses,
} from '@/hooks/use-plan-mutations';
import { useDebounce } from '@/hooks/use-debounce';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLocalEncryption } from '@/hooks/use-local-encryption';
import { useQueryClient } from '@tanstack/react-query';
import { FREQUENCY_LABELS, CATEGORY_LABELS } from '@/lib/constants';
import { highlightText, matchesSearch } from '@/lib/highlight-text';
import { convertExpenseToBase } from '@/lib/currency-conversion';
import { cn } from '@/lib/utils';
import { TemplatesSection } from '@/features/recurring-templates';
import { attachmentRepo } from '@/data/repos/attachment-repo';
import { useCurrencyStore } from '@/stores/currency-store';

type ExpenseFormData = z.infer<typeof ExpenseFormSchema>;

type SortField =
  | 'name'
  | 'amount'
  | 'category'
  | 'transactionDate'
  | 'createdAt';

type BulkEditFixedOption = 'no_change' | 'fixed' | 'variable';
type BulkEditValue<T extends string> = T | 'no_change';

interface BulkEditValues {
  category: BulkEditValue<ExpenseCategory>;
  bucketId: BulkEditValue<string>;
  frequency: BulkEditValue<Frequency>;
  fixed: BulkEditFixedOption;
}

interface ExpenseAttachmentPayload {
  newFiles: File[];
  removedIds: string[];
}

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'amount', label: 'Amount' },
  { value: 'category', label: 'Category' },
  { value: 'transactionDate', label: 'Transaction date' },
  { value: 'createdAt', label: 'Date added' },
];

const DEFAULT_BULK_EDIT_VALUES: BulkEditValues = {
  category: 'no_change',
  bucketId: 'no_change',
  frequency: 'no_change',
  fixed: 'no_change',
};
const EMPTY_SPLITS: ExpenseFormData['splits'] = [];

/** Search debounce delay in milliseconds */
const SEARCH_DEBOUNCE_MS = 300;

/** Helper to get today's date in ISO format (YYYY-MM-DD) */
function getTodayISODate(): string {
  return new Date().toISOString().split('T')[0];
}

/** Helper to format transaction date for display */
function formatTransactionDate(date: string | undefined): string {
  if (!date) return 'No date';
  try {
    return format(parseISO(date), 'MMM d, yyyy');
  } catch {
    return 'Invalid date';
  }
}

/**
 * Expenses page with comprehensive search and filtering capabilities.
 *
 * Features:
 * - Full-text search across name, notes, category, and bucket
 * - Multi-select filters for categories and buckets
 * - Date range filter for transaction dates
 * - Amount range filter (min/max based on monthly normalized)
 * - Frequency and type filters
 * - URL-persisted filter state via nuqs for shareable links
 * - Collapsible filter panel (auto-collapsed on mobile)
 * - Active filter chips with individual clear buttons
 * - Search result highlighting
 * - Enhanced no-results state with suggestions
 */
export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const { data: plan, isLoading: planLoading } = useActivePlan();
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses(
    plan?.id,
  );
  const { data: buckets = [] } = useBuckets(plan?.id);
  const { data: templates = [] } = useRecurringTemplates(plan?.id);
  const { data: exchangeRates } = useExchangeRates(plan?.id);
  const currencyCode = useCurrencyStore((s) => s.currencyCode);

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const bulkUpdateExpenses = useBulkUpdateExpenses();
  const bulkDeleteExpenses = useBulkDeleteExpenses();
  const { scheduleVaultSave } = useLocalEncryption();
  const isMobile = useIsMobile();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Listen for global Cmd+F to focus the search input
  useEffect(() => {
    const handleFocusSearch = () => {
      searchInputRef.current?.focus();
    };
    document.addEventListener('app:focus-search', handleFocusSearch);
    return () => {
      document.removeEventListener('app:focus-search', handleFocusSearch);
    };
  }, []);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(
    null,
  );
  const [deletingExpense, setDeletingExpense] = useState<ExpenseItem | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<string>('expenses');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkEditValues, setBulkEditValues] = useState<BulkEditValues>(
    DEFAULT_BULK_EDIT_VALUES,
  );
  // Start collapsed on mobile, expanded on desktop
  const [filtersExpanded, setFiltersExpanded] = useState(() => !isMobile);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    if (value !== 'expenses') {
      setSelectedIds(new Set());
    }
  }, []);
  // URL-based filter/sort state with nuqs
  const [filters, setFilters] = useQueryStates({
    q: parseAsString.withDefault(''),
    categories: parseAsArrayOf(parseAsString).withDefault([]),
    buckets: parseAsArrayOf(parseAsString).withDefault([]),
    frequency: parseAsString.withDefault(''),
    fixed: parseAsString.withDefault(''),
    minAmount: parseAsInteger.withDefault(0),
    maxAmount: parseAsInteger.withDefault(0),
    dateFrom: parseAsString.withDefault(''),
    dateTo: parseAsString.withDefault(''),
    sort: parseAsString.withDefault('name'),
  });

  // Debounce search query for performance
  const debouncedSearch = useDebounce(filters.q, SEARCH_DEBOUNCE_MS);

  const selectAllRef = useRef<HTMLInputElement>(null);

  // Calculate active filter count (excluding search and sort)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.categories.length > 0) count++;
    if (filters.buckets.length > 0) count++;
    if (filters.frequency) count++;
    if (filters.fixed) count++;
    if (filters.minAmount > 0) count++;
    if (filters.maxAmount > 0) count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    return count;
  }, [filters]);

  const hasActiveFilters =
    activeFilterCount > 0 || debouncedSearch.trim().length > 0;

  // --- Clear filter handlers ---
  const clearAllFilters = useCallback(() => {
    void setFilters({
      q: '',
      categories: [],
      buckets: [],
      frequency: '',
      fixed: '',
      minAmount: 0,
      maxAmount: 0,
      dateFrom: '',
      dateTo: '',
    });
  }, [setFilters]);

  const clearSearch = useCallback(() => {
    void setFilters({ q: '' });
  }, [setFilters]);

  const clearCategories = useCallback(() => {
    void setFilters({ categories: [] });
  }, [setFilters]);

  const clearBuckets = useCallback(() => {
    void setFilters({ buckets: [] });
  }, [setFilters]);

  const clearFrequency = useCallback(() => {
    void setFilters({ frequency: '' });
  }, [setFilters]);

  const clearFixed = useCallback(() => {
    void setFilters({ fixed: '' });
  }, [setFilters]);

  const clearAmountRange = useCallback(() => {
    void setFilters({ minAmount: 0, maxAmount: 0 });
  }, [setFilters]);

  const clearDateRange = useCallback(() => {
    void setFilters({ dateFrom: '', dateTo: '' });
  }, [setFilters]);

  // Create a lookup from bucket id to bucket
  const bucketMap = useMemo(() => {
    const map = new Map<string, BucketAllocation>();
    for (const b of buckets) {
      map.set(b.id, b);
    }
    return map;
  }, [buckets]);

  // Options for multi-select dropdowns
  const categoryOptions: MultiSelectOption[] = useMemo(
    () =>
      Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    [],
  );

  const bucketOptions: MultiSelectOption[] = useMemo(
    () =>
      buckets.map((b) => ({
        value: b.id,
        label: b.name,
        color: b.color,
      })),
    [buckets],
  );

  // Filtered and sorted expenses
  const filteredExpenses = useMemo(() => {
    let result = [...expenses];

    // Search filter
    if (debouncedSearch.trim()) {
      result = result.filter((e) => {
        const bucket = bucketMap.get(e.bucketId);
        const categoryLabel = CATEGORY_LABELS[e.category];
        return matchesSearch(
          debouncedSearch,
          e.name,
          e.notes,
          categoryLabel,
          bucket?.name,
        );
      });
    }

    // Category filter (multi-select)
    if (filters.categories.length > 0) {
      const categorySet = new Set(filters.categories);
      result = result.filter((e) => categorySet.has(e.category));
    }

    // Bucket filter (multi-select)
    if (filters.buckets.length > 0) {
      const bucketSet = new Set(filters.buckets);
      result = result.filter((e) => bucketSet.has(e.bucketId));
    }

    // Frequency filter
    if (filters.frequency) {
      result = result.filter((e) => e.frequency === filters.frequency);
    }

    // Fixed/Variable filter
    if (filters.fixed === 'true') {
      result = result.filter((e) => e.isFixed);
    } else if (filters.fixed === 'false') {
      result = result.filter((e) => !e.isFixed);
    }

    // Amount range filter (uses monthly normalized amount)
    if (filters.minAmount > 0) {
      const minCents = dollarsToCents(filters.minAmount);
      result = result.filter((e) => {
        const monthly = normalizeToMonthly(e.amountCents, e.frequency);
        return monthly >= minCents;
      });
    }
    if (filters.maxAmount > 0) {
      const maxCents = dollarsToCents(filters.maxAmount);
      result = result.filter((e) => {
        const monthly = normalizeToMonthly(e.amountCents, e.frequency);
        return monthly <= maxCents;
      });
    }

    // Date range filter
    if (filters.dateFrom) {
      result = result.filter((e) => {
        if (!e.transactionDate) return false;
        return e.transactionDate >= filters.dateFrom;
      });
    }
    if (filters.dateTo) {
      result = result.filter((e) => {
        if (!e.transactionDate) return false;
        return e.transactionDate <= filters.dateTo;
      });
    }

    // Sort
    const sortField = (filters.sort || 'name') as SortField;
    result.sort((a, b) => {
      switch (sortField) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'amount': {
          const aMonthly = normalizeToMonthly(a.amountCents, a.frequency);
          const bMonthly = normalizeToMonthly(b.amountCents, b.frequency);
          return bMonthly - aMonthly; // highest first
        }
        case 'category':
          return a.category.localeCompare(b.category);
        case 'transactionDate': {
          // Sort by transaction date, newest first. Items without date go to end.
          const aDate = a.transactionDate ?? '';
          const bDate = b.transactionDate ?? '';
          if (!aDate && !bDate) return 0;
          if (!aDate) return 1;
          if (!bDate) return -1;
          return bDate.localeCompare(aDate);
        }
        case 'createdAt':
          return b.createdAt.localeCompare(a.createdAt); // newest first
        default:
          return 0;
      }
    });

    return result;
  }, [expenses, debouncedSearch, filters, bucketMap]);

  const validSelectedIds = useMemo(() => {
    if (selectedIds.size === 0) return selectedIds;
    const validIds = new Set(expenses.map((expense) => expense.id));
    const next = new Set<string>();
    for (const id of selectedIds) {
      if (validIds.has(id)) next.add(id);
    }
    return next.size === selectedIds.size ? selectedIds : next;
  }, [expenses, selectedIds]);

  const selectedExpenses = useMemo(
    () => expenses.filter((expense) => validSelectedIds.has(expense.id)),
    [expenses, validSelectedIds],
  );

  const visibleIds = useMemo(
    () => filteredExpenses.map((expense) => expense.id),
    [filteredExpenses],
  );

  const selectedVisibleCount = useMemo(
    () => visibleIds.filter((id) => validSelectedIds.has(id)).length,
    [visibleIds, validSelectedIds],
  );

  const selectedCount = validSelectedIds.size;
  const allVisibleSelected =
    visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
  const hasSelection = selectedCount > 0;

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate =
      selectedVisibleCount > 0 && !allVisibleSelected;
  }, [selectedVisibleCount, allVisibleSelected]);

  // --- Handlers ---
  const handleToggleSelect = useCallback(
    (expenseId: string, checked: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (checked) {
          next.add(expenseId);
        } else {
          next.delete(expenseId);
        }
        return next;
      });
    },
    [],
  );

  const handleToggleSelectAllVisible = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const id of visibleIds) {
          next.delete(id);
        }
      } else {
        for (const id of visibleIds) {
          next.add(id);
        }
      }
      return next;
    });
  }, [allVisibleSelected, visibleIds]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleOpenBulkEdit = useCallback(() => {
    setBulkEditValues(DEFAULT_BULK_EDIT_VALUES);
    setBulkEditOpen(true);
  }, []);

  const handleOpenAdd = useCallback(() => {
    setEditingExpense(null);
    setSheetOpen(true);
  }, []);

  const handleOpenEdit = useCallback((expense: ExpenseItem) => {
    setEditingExpense(expense);
    setSheetOpen(true);
  }, []);

  const handleSave = useCallback(
    async (
      data: ExpenseFormData,
      attachmentPayload: ExpenseAttachmentPayload,
    ) => {
      if (!plan) return;
      const now = new Date().toISOString();

      // Convert split amounts from dollars to cents if present
      const splits: ExpenseSplit[] | undefined =
        data.isSplit && data.splits && data.splits.length >= 2
          ? data.splits.map((s) => ({
              bucketId: s.bucketId,
              category: s.category,
              amountCents: dollarsToCents(s.amountDollars),
              notes: s.notes,
            }))
          : undefined;

      // For split expenses, derive primary bucket/category from the largest split
      let primaryBucketId = data.bucketId;
      let primaryCategory = data.category;
      if (splits && splits.length > 0) {
        const largestSplit = splits.reduce((prev, curr) =>
          curr.amountCents > prev.amountCents ? curr : prev,
        );
        primaryBucketId = largestSplit.bucketId;
        primaryCategory = largestSplit.category;
      }
      const resolvedCurrency =
        data.currencyCode ?? plan.currencyCode ?? DEFAULT_CURRENCY;

      try {
        let expenseId: string;
        if (editingExpense) {
          const updated: ExpenseItem = {
            ...editingExpense,
            name: data.name,
            amountCents: dollarsToCents(data.amountDollars),
            frequency: data.frequency,
            category: primaryCategory,
            bucketId: primaryBucketId,
            currencyCode: resolvedCurrency,
            isFixed: data.isFixed ?? false,
            notes: data.notes,
            transactionDate: data.transactionDate,
            isSplit: data.isSplit ?? false,
            splits,
            updatedAt: now,
          };
          await updateExpense.mutateAsync(updated);
          toast.success('Expense updated');
          expenseId = updated.id;
        } else {
          const newExpenseId = crypto.randomUUID();
          const expense: ExpenseItem = {
            id: newExpenseId,
            planId: plan.id,
            name: data.name,
            amountCents: dollarsToCents(data.amountDollars),
            frequency: data.frequency,
            category: primaryCategory,
            bucketId: primaryBucketId,
            currencyCode: resolvedCurrency,
            isFixed: data.isFixed ?? false,
            notes: data.notes,
            transactionDate: data.transactionDate ?? getTodayISODate(),
            isSplit: data.isSplit ?? false,
            splits,
            createdAt: now,
            updatedAt: now,
          };
          await createExpense.mutateAsync(expense);
          toast.success('Expense added');
          expenseId = newExpenseId;
        }

        if (attachmentPayload.removedIds.length > 0) {
          await Promise.all(
            attachmentPayload.removedIds.map((id) => attachmentRepo.delete(id)),
          );
        }

        if (attachmentPayload.newFiles.length > 0) {
          const attachments = attachmentPayload.newFiles.map((file) => ({
            id: crypto.randomUUID(),
            planId: plan.id,
            expenseId,
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
            size: file.size,
            blob: file,
            createdAt: now,
          }));
          await attachmentRepo.bulkCreate(attachments);
        }

        await queryClient.invalidateQueries({
          queryKey: ['expense-attachments', expenseId],
        });
        scheduleVaultSave();
        setSheetOpen(false);
        setEditingExpense(null);
      } catch {
        toast.error('Failed to save expense');
      }
    },
    [
      plan,
      editingExpense,
      createExpense,
      updateExpense,
      queryClient,
      scheduleVaultSave,
    ],
  );

  const handleDelete = useCallback(async () => {
    if (!deletingExpense || !plan) return;
    try {
      await deleteExpense.mutateAsync({
        id: deletingExpense.id,
        planId: plan.id,
      });
      toast.success('Expense deleted');
      setDeletingExpense(null);
    } catch {
      toast.error('Failed to delete expense. Please try again.');
    }
  }, [deletingExpense, plan, deleteExpense]);

  const selectedSplitCount = useMemo(
    () => selectedExpenses.filter((expense) => expense.isSplit).length,
    [selectedExpenses],
  );

  const bulkEditHasChanges = useMemo(() => {
    return (
      bulkEditValues.category !== 'no_change' ||
      bulkEditValues.bucketId !== 'no_change' ||
      bulkEditValues.frequency !== 'no_change' ||
      bulkEditValues.fixed !== 'no_change'
    );
  }, [bulkEditValues]);

  const handleBulkEditApply = useCallback(async () => {
    if (!plan || selectedExpenses.length === 0 || !bulkEditHasChanges) {
      return;
    }

    const updatedExpenses = selectedExpenses.map((expense) => {
      return {
        ...expense,
        frequency:
          bulkEditValues.frequency !== 'no_change'
            ? (bulkEditValues.frequency as Frequency)
            : expense.frequency,
        isFixed:
          bulkEditValues.fixed !== 'no_change'
            ? bulkEditValues.fixed === 'fixed'
            : expense.isFixed,
        category:
          !expense.isSplit && bulkEditValues.category !== 'no_change'
            ? (bulkEditValues.category as ExpenseCategory)
            : expense.category,
        bucketId:
          !expense.isSplit && bulkEditValues.bucketId !== 'no_change'
            ? bulkEditValues.bucketId
            : expense.bucketId,
      };
    });

    try {
      await bulkUpdateExpenses.mutateAsync(updatedExpenses);
      toast.success(`Updated ${updatedExpenses.length} expense(s)`);
      setBulkEditOpen(false);
      setBulkEditValues(DEFAULT_BULK_EDIT_VALUES);
      setSelectedIds(new Set());
    } catch {
      toast.error('Failed to update expenses. Please try again.');
    }
  }, [
    plan,
    selectedExpenses,
    bulkEditHasChanges,
    bulkEditValues,
    bulkUpdateExpenses,
  ]);

  const handleBulkDelete = useCallback(async () => {
    if (!plan || validSelectedIds.size === 0) return;
    const ids = Array.from(validSelectedIds);
    try {
      await bulkDeleteExpenses.mutateAsync({ ids, planId: plan.id });
      toast.success(`Deleted ${ids.length} expense(s)`);
      setBulkDeleteOpen(false);
      setSelectedIds(new Set());
    } catch {
      toast.error('Failed to delete expenses. Please try again.');
    }
  }, [plan, validSelectedIds, bulkDeleteExpenses]);

  const handleSaveAsTemplate = useCallback(
    async (expense: ExpenseItem) => {
      try {
        // Infer day of month from transaction date if available
        let dayOfMonth: number | undefined;
        if (expense.transactionDate) {
          dayOfMonth = new Date(expense.transactionDate).getDate();
        }
        await recurringService.createTemplateFromExpense(expense, dayOfMonth);
        scheduleVaultSave();
        toast.success(`Created template from "${expense.name}"`);
        // Optionally switch to templates tab
        handleTabChange('templates');
      } catch {
        toast.error('Failed to create template');
      }
    },
    [scheduleVaultSave, handleTabChange],
  );

  const totalMonthly = useMemo(() => {
    const baseCurrency = plan?.currencyCode ?? DEFAULT_CURRENCY;
    return filteredExpenses.reduce((sum, expense) => {
      const converted = convertExpenseToBase(
        expense,
        baseCurrency,
        exchangeRates ?? undefined,
      );
      return addMoney(
        sum,
        normalizeToMonthly(converted.amountCents, converted.frequency),
      );
    }, cents(0));
  }, [filteredExpenses, plan?.currencyCode, exchangeRates]);

  const isLoading = planLoading || expensesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Expenses"
          description="Complete onboarding to start tracking expenses."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Track and manage your recurring expenses."
        action={
          activeTab === 'expenses' ? (
            <Button size="sm" onClick={handleOpenAdd}>
              <Plus className="size-4" />
              Add expense
            </Button>
          ) : undefined
        }
      />

      {/* Tabs for Expenses and Templates */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="expenses">
            <Receipt className="size-4" />
            Expenses
            {expenses.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-xs">
                {expenses.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="templates">
            <RefreshCw className="size-4" />
            Templates
            {templates.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-xs">
                {templates.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-6">
          {/* Search and Filter Section */}
          {expenses.length > 0 && (
            <Card>
              <CardContent className="space-y-4 pt-6">
                {/* Search Input */}
                <div className="relative">
                  <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                  <Input
                    ref={searchInputRef}
                    type="search"
                    placeholder="Search expenses by name, notes, category, or bucket..."
                    value={filters.q}
                    onChange={(e) => void setFilters({ q: e.target.value })}
                    className="pl-9 pr-9"
                    aria-label="Search expenses"
                  />
                  {filters.q && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
                      aria-label="Clear search"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>

                {/* Collapsible Filters */}
                <Collapsible
                  open={filtersExpanded}
                  onOpenChange={setFiltersExpanded}
                >
                  <div className="flex items-center justify-between">
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-2 h-8 gap-1"
                      >
                        <Filter className="size-4" />
                        Filters
                        {activeFilterCount > 0 && (
                          <Badge
                            variant="secondary"
                            className="ml-1 px-1.5 py-0"
                          >
                            {activeFilterCount}
                          </Badge>
                        )}
                        {filtersExpanded ? (
                          <ChevronUp className="size-4" />
                        ) : (
                          <ChevronDown className="size-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>

                    <div className="flex items-center gap-2">
                      {/* Sort */}
                      <div className="flex items-center gap-1.5">
                        <SortAsc className="text-muted-foreground size-4 shrink-0" />
                        <Select
                          value={filters.sort}
                          onValueChange={(val) =>
                            void setFilters({ sort: val })
                          }
                        >
                          <SelectTrigger
                            className="h-8 w-[140px]"
                            aria-label="Sort by"
                          >
                            <SelectValue placeholder="Sort" />
                          </SelectTrigger>
                          <SelectContent>
                            {SORT_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {hasActiveFilters && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearAllFilters}
                          className="h-8"
                        >
                          <X className="size-3" />
                          Clear all
                        </Button>
                      )}
                    </div>
                  </div>

                  <CollapsibleContent className="pt-4">
                    <div className="flex flex-wrap items-end gap-3">
                      {/* Category Multi-Select */}
                      <div className="space-y-1.5">
                        <Label className="text-muted-foreground text-xs">
                          Categories
                        </Label>
                        <MultiSelect
                          options={categoryOptions}
                          value={filters.categories}
                          onChange={(val) =>
                            void setFilters({ categories: val })
                          }
                          placeholder="All categories"
                          ariaLabel="Filter by categories"
                        />
                      </div>

                      {/* Bucket Multi-Select */}
                      {buckets.length > 0 && (
                        <div className="space-y-1.5">
                          <Label className="text-muted-foreground text-xs">
                            Buckets
                          </Label>
                          <MultiSelect
                            options={bucketOptions}
                            value={filters.buckets}
                            onChange={(val) =>
                              void setFilters({ buckets: val })
                            }
                            placeholder="All buckets"
                            ariaLabel="Filter by buckets"
                          />
                        </div>
                      )}

                      {/* Frequency */}
                      <div className="space-y-1.5">
                        <Label className="text-muted-foreground text-xs">
                          Frequency
                        </Label>
                        <Select
                          value={filters.frequency}
                          onValueChange={(val) =>
                            void setFilters({
                              frequency: val === 'all' ? '' : val,
                            })
                          }
                        >
                          <SelectTrigger
                            className="h-8 w-[140px]"
                            aria-label="Filter by frequency"
                          >
                            <SelectValue placeholder="All frequencies" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All frequencies</SelectItem>
                            {Object.entries(FREQUENCY_LABELS).map(
                              ([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Type (Fixed/Variable) */}
                      <div className="space-y-1.5">
                        <Label className="text-muted-foreground text-xs">
                          Type
                        </Label>
                        <Select
                          value={filters.fixed}
                          onValueChange={(val) =>
                            void setFilters({ fixed: val === 'all' ? '' : val })
                          }
                        >
                          <SelectTrigger
                            className="h-8 w-[120px]"
                            aria-label="Filter by expense type"
                          >
                            <SelectValue placeholder="All types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All types</SelectItem>
                            <SelectItem value="true">Fixed</SelectItem>
                            <SelectItem value="false">Variable</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Amount Range */}
                      <div className="space-y-1.5">
                        <Label className="text-muted-foreground text-xs">
                          Amount range (monthly)
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            placeholder="Min"
                            min={0}
                            value={filters.minAmount || ''}
                            onChange={(e) =>
                              void setFilters({
                                minAmount: e.target.value
                                  ? parseInt(e.target.value, 10)
                                  : 0,
                              })
                            }
                            className="h-8 w-20"
                            aria-label="Minimum amount"
                          />
                          <span className="text-muted-foreground">-</span>
                          <Input
                            type="number"
                            placeholder="Max"
                            min={0}
                            value={filters.maxAmount || ''}
                            onChange={(e) =>
                              void setFilters({
                                maxAmount: e.target.value
                                  ? parseInt(e.target.value, 10)
                                  : 0,
                              })
                            }
                            className="h-8 w-20"
                            aria-label="Maximum amount"
                          />
                        </div>
                      </div>

                      {/* Date Range */}
                      <div className="space-y-1.5">
                        <Label className="text-muted-foreground text-xs">
                          Date range
                        </Label>
                        <div className="flex items-center gap-2">
                          <DatePickerButton
                            value={filters.dateFrom}
                            onChange={(val) =>
                              void setFilters({ dateFrom: val })
                            }
                            placeholder="From"
                            ariaLabel="Filter from date"
                          />
                          <span className="text-muted-foreground">-</span>
                          <DatePickerButton
                            value={filters.dateTo}
                            onChange={(val) => void setFilters({ dateTo: val })}
                            placeholder="To"
                            ariaLabel="Filter to date"
                          />
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Active Filter Chips */}
                {hasActiveFilters && (
                  <div className="flex flex-wrap gap-2">
                    {debouncedSearch.trim() && (
                      <FilterChip
                        label={`Search: "${debouncedSearch}"`}
                        onClear={clearSearch}
                      />
                    )}
                    {filters.categories.length > 0 && (
                      <FilterChip
                        label={`Categories: ${filters.categories.map((c) => CATEGORY_LABELS[c as keyof typeof CATEGORY_LABELS] ?? c).join(', ')}`}
                        onClear={clearCategories}
                      />
                    )}
                    {filters.buckets.length > 0 && (
                      <FilterChip
                        label={`Buckets: ${filters.buckets.map((id) => bucketMap.get(id)?.name ?? id).join(', ')}`}
                        onClear={clearBuckets}
                      />
                    )}
                    {filters.frequency && (
                      <FilterChip
                        label={`Frequency: ${FREQUENCY_LABELS[filters.frequency as keyof typeof FREQUENCY_LABELS] ?? filters.frequency}`}
                        onClear={clearFrequency}
                      />
                    )}
                    {filters.fixed && (
                      <FilterChip
                        label={
                          filters.fixed === 'true'
                            ? 'Fixed only'
                            : 'Variable only'
                        }
                        onClear={clearFixed}
                      />
                    )}
                    {(filters.minAmount > 0 || filters.maxAmount > 0) && (
                      <FilterChip
                        label={`Amount: ${filters.minAmount > 0 ? `$${filters.minAmount}` : '$0'} - ${filters.maxAmount > 0 ? `$${filters.maxAmount}` : 'any'}`}
                        onClear={clearAmountRange}
                      />
                    )}
                    {(filters.dateFrom || filters.dateTo) && (
                      <FilterChip
                        label={`Date: ${filters.dateFrom ? formatTransactionDate(filters.dateFrom) : 'any'} - ${filters.dateTo ? formatTransactionDate(filters.dateTo) : 'any'}`}
                        onClear={clearDateRange}
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Result Summary */}
          {filteredExpenses.length > 0 && (
            <div className="text-muted-foreground text-sm">
              {filteredExpenses.length} expense
              {filteredExpenses.length !== 1 && 's'}
              {hasActiveFilters && ` (filtered from ${expenses.length})`}{' '}
              &mdash;{' '}
              <span className="font-medium tabular-nums">
                {formatMoney(totalMonthly, { currency: currencyCode })}
              </span>
              /mo
            </div>
          )}

          {filteredExpenses.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  className="accent-primary size-4 rounded border"
                  checked={allVisibleSelected}
                  onChange={handleToggleSelectAllVisible}
                  aria-label="Select all visible expenses"
                />
                <span>Select all {filteredExpenses.length} visible</span>
              </label>
              <span className="text-muted-foreground">
                {selectedCount} selected
              </span>
            </div>
          )}

          {hasSelection && (
            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="text-sm font-medium">
                  {selectedCount} selected
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleOpenBulkEdit}
                    disabled={selectedCount === 0}
                  >
                    <Pencil className="size-4" />
                    Bulk edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setBulkDeleteOpen(true)}
                    disabled={selectedCount === 0}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleClearSelection}
                  >
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Expense list */}
          {expenses.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No expenses yet"
              description="Add your recurring expenses to start tracking your budget."
              action={{
                label: 'Add your first expense',
                onClick: handleOpenAdd,
              }}
            />
          ) : filteredExpenses.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No matching expenses"
              description={getNoResultsDescription(
                debouncedSearch,
                activeFilterCount,
              )}
              action={{
                label: 'Clear all filters',
                onClick: clearAllFilters,
              }}
            />
          ) : (
            <div className="space-y-3">
              {filteredExpenses.map((expense) => {
                const monthly = normalizeToMonthly(
                  expense.amountCents,
                  expense.frequency,
                );
                const bucket = bucketMap.get(expense.bucketId);
                const showNormalized = expense.frequency !== 'monthly';

                return (
                  <ExpenseCard
                    key={expense.id}
                    expense={expense}
                    bucket={bucket}
                    bucketMap={bucketMap}
                    monthlyAmount={monthly}
                    showNormalized={showNormalized}
                    searchQuery={debouncedSearch}
                    onEdit={() => handleOpenEdit(expense)}
                    onDelete={() => setDeletingExpense(expense)}
                    onSaveAsTemplate={() => handleSaveAsTemplate(expense)}
                    selected={validSelectedIds.has(expense.id)}
                    onToggleSelected={(checked) =>
                      handleToggleSelect(expense.id, checked)
                    }
                  />
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates">
          <TemplatesSection planId={plan.id} buckets={buckets} />
        </TabsContent>
      </Tabs>

      {/* Add / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {editingExpense ? 'Edit expense' : 'New expense'}
            </SheetTitle>
            <SheetDescription>
              {editingExpense
                ? 'Update this recurring expense.'
                : 'Add a new recurring expense to your budget.'}
            </SheetDescription>
          </SheetHeader>
          <ExpenseForm
            key={editingExpense?.id ?? 'new'}
            expense={editingExpense}
            buckets={buckets}
            onSave={handleSave}
            onCancel={() => setSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Bulk edit dialog */}
      <Dialog
        open={bulkEditOpen}
        onOpenChange={(open) => {
          if (!open) {
            setBulkEditValues(DEFAULT_BULK_EDIT_VALUES);
          }
          setBulkEditOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk edit expenses</DialogTitle>
            <DialogDescription>
              Apply changes to {selectedCount} selected expense
              {selectedCount !== 1 && 's'}. Fields set to “No change” will be
              left untouched.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={bulkEditValues.category}
                onValueChange={(value) =>
                  setBulkEditValues((prev) => ({
                    ...prev,
                    category: value as BulkEditValues['category'],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_change">No change</SelectItem>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Bucket</Label>
              <Select
                value={bulkEditValues.bucketId}
                onValueChange={(value) =>
                  setBulkEditValues((prev) => ({
                    ...prev,
                    bucketId: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_change">No change</SelectItem>
                  {buckets.map((bucket) => (
                    <SelectItem key={bucket.id} value={bucket.id}>
                      <span
                        className="mr-1.5 inline-block size-2 rounded-full"
                        style={{ backgroundColor: bucket.color }}
                        aria-hidden="true"
                      />
                      {bucket.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedSplitCount > 0 && (
                <p className="text-muted-foreground text-xs">
                  Category and bucket changes won’t apply to split expenses.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select
                value={bulkEditValues.frequency}
                onValueChange={(value) =>
                  setBulkEditValues((prev) => ({
                    ...prev,
                    frequency: value as BulkEditValues['frequency'],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_change">No change</SelectItem>
                  {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={bulkEditValues.fixed}
                onValueChange={(value) =>
                  setBulkEditValues((prev) => ({
                    ...prev,
                    fixed: value as BulkEditFixedOption,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_change">No change</SelectItem>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="variable">Variable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkEditApply}
              disabled={!bulkEditHasChanges || bulkUpdateExpenses.isPending}
            >
              {bulkUpdateExpenses.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Apply changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk delete confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected expenses?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedCount} expense
              {selectedCount !== 1 && 's'}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={bulkDeleteExpenses.isPending}
            >
              {bulkDeleteExpenses.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Delete selected
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingExpense}
        onOpenChange={(open) => {
          if (!open) setDeletingExpense(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{deletingExpense?.name}
              &rdquo; from your budget.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// --- Filter Chip Component ---

interface FilterChipProps {
  label: string;
  onClear: () => void;
}

function FilterChip({ label, onClear }: FilterChipProps) {
  return (
    <Badge variant="secondary" className="gap-1 pr-1">
      <span className="max-w-[200px] truncate">{label}</span>
      <button
        type="button"
        onClick={onClear}
        className="hover:bg-muted rounded-sm p-0.5"
        aria-label={`Remove filter: ${label}`}
      >
        <X className="size-3" />
      </button>
    </Badge>
  );
}

// --- Date Picker Button Component ---

interface DatePickerButtonProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
}

function DatePickerButton({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: DatePickerButtonProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'h-8 w-[110px] justify-start text-left font-normal',
            !value && 'text-muted-foreground',
          )}
          aria-label={ariaLabel}
        >
          <CalendarIcon className="mr-1 size-3" />
          <span className="truncate">
            {value ? format(parseISO(value), 'MMM d, yy') : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ? parseISO(value) : undefined}
          onSelect={(date) => {
            onChange(date ? format(date, 'yyyy-MM-dd') : '');
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

// --- Expense Card Component ---

interface ExpenseCardProps {
  expense: ExpenseItem;
  bucket: BucketAllocation | undefined;
  bucketMap: Map<string, BucketAllocation>;
  monthlyAmount: Cents;
  showNormalized: boolean;
  searchQuery: string;
  onEdit: () => void;
  onDelete: () => void;
  onSaveAsTemplate: () => void;
  selected: boolean;
  onToggleSelected: (checked: boolean) => void;
}

function ExpenseCard({
  expense,
  bucket,
  bucketMap,
  monthlyAmount,
  showNormalized,
  searchQuery,
  onEdit,
  onDelete,
  onSaveAsTemplate,
  selected,
  onToggleSelected,
}: ExpenseCardProps) {
  const [splitExpanded, setSplitExpanded] = useState(false);
  const baseCurrency = useCurrencyStore((s) => s.currencyCode);
  const expenseCurrency =
    expense.currencyCode ?? baseCurrency ?? DEFAULT_CURRENCY;

  // Highlight matching text in name
  const nameContent = useMemo(() => {
    if (!searchQuery.trim()) return expense.name;
    const { segments } = highlightText(expense.name, searchQuery);
    return segments;
  }, [expense.name, searchQuery]);

  // Highlight matching text in category label
  const categoryContent = useMemo(() => {
    const label = CATEGORY_LABELS[expense.category];
    if (!searchQuery.trim()) return label;
    const { segments } = highlightText(label, searchQuery);
    return segments;
  }, [expense.category, searchQuery]);

  // Highlight matching text in bucket name
  const bucketContent = useMemo(() => {
    if (!bucket) return null;
    if (!searchQuery.trim()) return bucket.name;
    const { segments } = highlightText(bucket.name, searchQuery);
    return segments;
  }, [bucket, searchQuery]);

  const isSplit =
    expense.isSplit && expense.splits && expense.splits.length > 0;
  const splitCount = isSplit ? expense.splits!.length : 0;

  return (
    <Card className={cn(selected && 'border-primary/50 bg-primary/5')}>
      <CardContent className="py-4">
        <div className="flex items-center gap-4">
          <input
            type="checkbox"
            className="accent-primary size-4 rounded border"
            checked={selected}
            onChange={(e) => onToggleSelected(e.target.checked)}
            aria-label={`Select expense ${expense.name}`}
          />
          {/* Color swatch - show multiple colors for splits */}
          {isSplit ? (
            <div className="flex shrink-0 -space-x-1">
              {expense.splits!.slice(0, 3).map((split, idx) => {
                const splitBucket = bucketMap.get(split.bucketId);
                return (
                  <span
                    key={idx}
                    className="size-2.5 rounded-full ring-2 ring-white dark:ring-gray-900"
                    style={{ backgroundColor: splitBucket?.color ?? '#888' }}
                    aria-hidden="true"
                  />
                );
              })}
              {expense.splits!.length > 3 && (
                <span
                  className="flex size-2.5 items-center justify-center rounded-full bg-gray-400 text-[6px] text-white ring-2 ring-white dark:ring-gray-900"
                  aria-hidden="true"
                >
                  +
                </span>
              )}
            </div>
          ) : bucket ? (
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: bucket.color }}
              aria-hidden="true"
            />
          ) : null}

          {/* Name + meta */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">{nameContent}</span>
              <Badge
                variant={expense.isFixed ? 'secondary' : 'outline'}
                className="shrink-0"
              >
                {expense.isFixed ? 'Fixed' : 'Variable'}
              </Badge>
              {isSplit && (
                <Badge
                  variant="outline"
                  className="shrink-0 cursor-pointer gap-1"
                  onClick={() => setSplitExpanded(!splitExpanded)}
                >
                  <Split className="size-3" />
                  {splitCount} splits
                </Badge>
              )}
            </div>
            <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
              <span>{categoryContent}</span>
              {bucketContent && (
                <>
                  <span aria-hidden="true">&middot;</span>
                  <span>{bucketContent}</span>
                </>
              )}
              {isSplit && (
                <>
                  <span aria-hidden="true">&middot;</span>
                  <span className="text-blue-600 dark:text-blue-400">
                    +{splitCount - 1} more
                  </span>
                </>
              )}
              <span aria-hidden="true">&middot;</span>
              <span>{FREQUENCY_LABELS[expense.frequency]}</span>
              {expense.transactionDate && (
                <>
                  <span aria-hidden="true">&middot;</span>
                  <span>{formatTransactionDate(expense.transactionDate)}</span>
                </>
              )}
            </div>
          </div>

          {/* Amount */}
          <div className="shrink-0 text-right">
            <div className="font-medium tabular-nums">
              {formatMoney(expense.amountCents, { currency: expenseCurrency })}
              {showNormalized && (
                <span className="text-muted-foreground text-xs">
                  /
                  {expense.frequency === 'weekly'
                    ? 'wk'
                    : expense.frequency === 'biweekly'
                      ? '2wk'
                      : expense.frequency === 'quarterly'
                        ? 'qtr'
                        : expense.frequency === 'annual'
                          ? 'yr'
                          : expense.frequency === 'semimonthly'
                            ? '2mo'
                            : 'mo'}
                </span>
              )}
            </div>
            {showNormalized && (
              <div className="text-muted-foreground text-xs tabular-nums">
                {formatMoney(monthlyAmount, { currency: expenseCurrency })}/mo
              </div>
            )}
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                aria-label={`Actions for ${expense.name}`}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSaveAsTemplate}>
                <Repeat className="size-4" />
                Save as template
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Expandable split details */}
        {isSplit && splitExpanded && (
          <div className="mt-3 border-t pt-3">
            <div className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
              Split breakdown
            </div>
            <div className="space-y-2">
              {expense.splits!.map((split, idx) => {
                const splitBucket = bucketMap.get(split.bucketId);
                return (
                  <div
                    key={idx}
                    className="bg-muted/50 flex items-center gap-3 rounded-md px-3 py-2 text-sm"
                  >
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: splitBucket?.color ?? '#888' }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {splitBucket?.name ?? 'Unknown bucket'}
                        </span>
                        <span className="text-muted-foreground">
                          {CATEGORY_LABELS[split.category]}
                        </span>
                      </div>
                      {split.notes && (
                        <div className="text-muted-foreground mt-0.5 text-xs">
                          {split.notes}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 font-medium tabular-nums">
                      {formatMoney(split.amountCents, {
                        currency: expenseCurrency,
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Helper Functions ---

function getNoResultsDescription(
  searchQuery: string,
  filterCount: number,
): string {
  const suggestions: string[] = [];

  if (searchQuery.trim()) {
    suggestions.push('check your spelling or try different keywords');
  }

  if (filterCount > 0) {
    suggestions.push('try removing some filters');
  }

  if (suggestions.length === 0) {
    return 'Try adjusting your search or filters to see more results.';
  }

  return `Try ${suggestions.join(' or ')}.`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}

// --- Expense Form ---

interface ExpenseFormProps {
  expense: ExpenseItem | null;
  buckets: BucketAllocation[];
  onSave: (
    data: ExpenseFormData,
    attachments: ExpenseAttachmentPayload,
  ) => Promise<void>;
  onCancel: () => void;
}

function ExpenseForm({ expense, buckets, onSave, onCancel }: ExpenseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const baseCurrency = useCurrencyStore((s) => s.currencyCode);
  const defaultCurrency =
    expense?.currencyCode ?? baseCurrency ?? DEFAULT_CURRENCY;
  const { data: existingAttachments = [] } = useExpenseAttachments(expense?.id);
  const [newAttachments, setNewAttachments] = useState<File[]>([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<Set<string>>(
    () => new Set(),
  );

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(ExpenseFormSchema),
    defaultValues: expense
      ? {
          name: expense.name,
          amountDollars: centsToDollars(expense.amountCents),
          frequency: expense.frequency,
          category: expense.category,
          bucketId: expense.bucketId,
          currencyCode: expense.currencyCode ?? defaultCurrency,
          isFixed: expense.isFixed,
          notes: expense.notes ?? '',
          transactionDate: expense.transactionDate ?? getTodayISODate(),
          isSplit: expense.isSplit ?? false,
          splits:
            expense.splits?.map((s) => ({
              bucketId: s.bucketId,
              category: s.category,
              amountDollars: centsToDollars(s.amountCents),
              notes: s.notes,
            })) ?? [],
        }
      : {
          name: '',
          amountDollars: 0,
          frequency: 'monthly',
          category: 'other',
          bucketId: buckets[0]?.id ?? '',
          currencyCode: defaultCurrency,
          isFixed: false,
          notes: '',
          transactionDate: getTodayISODate(),
          isSplit: false,
          splits: [],
        },
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'splits',
  });

  const isSplit = watch('isSplit');
  const totalAmount = watch('amountDollars');
  const splits = watch('splits') ?? EMPTY_SPLITS;
  const selectedCurrency = watch('currencyCode') ?? defaultCurrency;
  const currencySymbol = getCurrencySymbol(selectedCurrency as CurrencyCode);

  // Calculate split total and remaining amount
  const splitTotal = useMemo(
    () => splits.reduce((sum, s) => sum + (s.amountDollars || 0), 0),
    [splits],
  );
  const remainingAmount = totalAmount - splitTotal;
  const splitsMatch = Math.abs(remainingAmount) < 0.01;

  useEffect(() => {
    setNewAttachments([]);
    setRemovedAttachmentIds(new Set());
  }, [expense?.id]);

  const visibleExistingAttachments = useMemo(
    () => existingAttachments.filter((a) => !removedAttachmentIds.has(a.id)),
    [existingAttachments, removedAttachmentIds],
  );

  const handleAddAttachments = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      if (files.length === 0) return;
      setNewAttachments((prev) => [...prev, ...files]);
      event.target.value = '';
    },
    [],
  );

  const handleRemoveNewAttachment = useCallback((index: number) => {
    setNewAttachments((prev) => prev.filter((_, idx) => idx !== index));
  }, []);

  const handleRemoveExistingAttachment = useCallback((id: string) => {
    setRemovedAttachmentIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const handleViewAttachment = useCallback((blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) {
      URL.revokeObjectURL(url);
      return;
    }
    win.document.title = name;
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }, []);

  // Handle toggle split mode
  const handleToggleSplit = useCallback(
    (enabled: boolean) => {
      setValue('isSplit', enabled);
      if (enabled && fields.length === 0) {
        // Initialize with two splits when enabling
        const halfAmount = totalAmount / 2;
        append({
          bucketId: buckets[0]?.id ?? '',
          category: 'other',
          amountDollars: halfAmount,
          notes: '',
        });
        append({
          bucketId: buckets[0]?.id ?? '',
          category: 'other',
          amountDollars: halfAmount,
          notes: '',
        });
      }
    },
    [setValue, fields.length, totalAmount, buckets, append],
  );

  // Add a new split
  const handleAddSplit = useCallback(() => {
    append({
      bucketId: buckets[0]?.id ?? '',
      category: 'other',
      amountDollars: Math.max(0, remainingAmount),
      notes: '',
    });
  }, [append, buckets, remainingAmount]);

  // Auto-distribute remaining amount to last split
  const handleAutoBalance = useCallback(() => {
    if (fields.length === 0) return;
    const lastIndex = fields.length - 1;
    const currentLast = splits[lastIndex]?.amountDollars ?? 0;
    setValue(
      `splits.${lastIndex}.amountDollars`,
      currentLast + remainingAmount,
    );
  }, [fields.length, splits, remainingAmount, setValue]);

  const onSubmit = async (data: ExpenseFormData) => {
    setIsSubmitting(true);
    try {
      await onSave(data, {
        newFiles: newAttachments,
        removedIds: Array.from(removedAttachmentIds),
      });
      setNewAttachments([]);
      setRemovedAttachmentIds(new Set());
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5 px-4 pt-4"
    >
      <div className="space-y-2">
        <Label htmlFor="expense-name">Name</Label>
        <Input
          id="expense-name"
          placeholder="e.g., Rent"
          aria-invalid={!!errors.name}
          {...register('name')}
        />
        {errors.name && (
          <p className="text-destructive text-sm">{errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="expense-amount">Amount</Label>
          <Controller
            control={control}
            name="amountDollars"
            render={({ field, fieldState }) => (
              <>
                <MoneyInput
                  id="expense-amount"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  min={0}
                  currencyCode={watch('currencyCode') ?? defaultCurrency}
                />
                {fieldState.error && (
                  <p className="text-destructive text-sm">
                    {fieldState.error.message}
                  </p>
                )}
              </>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expense-currency">Currency</Label>
          <Controller
            control={control}
            name="currencyCode"
            render={({ field }) => (
              <Select
                value={field.value ?? defaultCurrency}
                onValueChange={(value) => field.onChange(value as CurrencyCode)}
              >
                <SelectTrigger id="expense-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expense-frequency">Frequency</Label>
          <Controller
            control={control}
            name="frequency"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="expense-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      {/* Split Transaction Toggle */}
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="space-y-0.5">
          <Label htmlFor="expense-split" className="font-medium">
            Split this expense
          </Label>
          <p className="text-muted-foreground text-xs">
            Divide across multiple buckets or categories
          </p>
        </div>
        <Controller
          control={control}
          name="isSplit"
          render={({ field }) => (
            <Switch
              id="expense-split"
              checked={field.value ?? false}
              onCheckedChange={handleToggleSplit}
            />
          )}
        />
      </div>

      {/* Non-split: show single bucket/category selection */}
      {!isSplit && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="expense-category">Category</Label>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="expense-category">
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
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-bucket">Bucket</Label>
            <Controller
              control={control}
              name="bucketId"
              render={({ field, fieldState }) => (
                <>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="expense-bucket">
                      <SelectValue placeholder="Select bucket" />
                    </SelectTrigger>
                    <SelectContent>
                      {buckets.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          <span
                            className="mr-1.5 inline-block size-2 rounded-full"
                            style={{ backgroundColor: b.color }}
                          />
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <p className="text-destructive text-sm">
                      {fieldState.error.message}
                    </p>
                  )}
                </>
              )}
            />
          </div>
        </div>
      )}

      {/* Split: show split entries */}
      {isSplit && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="font-medium">Split allocations</Label>
            <div className="flex items-center gap-2">
              {!splitsMatch && fields.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAutoBalance}
                  className="h-7 text-xs"
                >
                  Auto-balance
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddSplit}
                className="h-7"
              >
                <Plus className="size-3" />
                Add split
              </Button>
            </div>
          </div>

          {/* Split total indicator */}
          <div
            className={cn(
              'flex items-center justify-between rounded-md px-3 py-2 text-sm',
              splitsMatch
                ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
            )}
          >
            <span>
              Split total: {currencySymbol}
              {splitTotal.toFixed(2)} / {currencySymbol}
              {totalAmount.toFixed(2)}
            </span>
            {!splitsMatch && (
              <span className="font-medium">
                {remainingAmount > 0 ? '+' : ''}
                {currencySymbol}
                {remainingAmount.toFixed(2)}{' '}
                {remainingAmount > 0 ? 'remaining' : 'over'}
              </span>
            )}
            {splitsMatch && <span className="font-medium">Balanced</span>}
          </div>

          {/* Split entries */}
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="bg-muted/30 space-y-2 rounded-lg border p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs font-medium">
                    Split {index + 1}
                  </span>
                  {fields.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      className="size-6"
                      aria-label={`Remove split ${index + 1}`}
                    >
                      <X className="size-3" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label
                      htmlFor={`split-${index}-bucket`}
                      className="text-xs"
                    >
                      Bucket
                    </Label>
                    <Controller
                      control={control}
                      name={`splits.${index}.bucketId`}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger
                            id={`split-${index}-bucket`}
                            className="h-8"
                          >
                            <SelectValue placeholder="Select bucket" />
                          </SelectTrigger>
                          <SelectContent>
                            {buckets.map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                <span
                                  className="mr-1.5 inline-block size-2 rounded-full"
                                  style={{ backgroundColor: b.color }}
                                />
                                {b.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label
                      htmlFor={`split-${index}-category`}
                      className="text-xs"
                    >
                      Category
                    </Label>
                    <Controller
                      control={control}
                      name={`splits.${index}.category`}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger
                            id={`split-${index}-category`}
                            className="h-8"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(CATEGORY_LABELS).map(
                              ([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label
                      htmlFor={`split-${index}-amount`}
                      className="text-xs"
                    >
                      Amount
                    </Label>
                    <Controller
                      control={control}
                      name={`splits.${index}.amountDollars`}
                      render={({ field }) => (
                        <MoneyInput
                          id={`split-${index}-amount`}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          min={0}
                          currencyCode={
                            watch('currencyCode') ?? defaultCurrency
                          }
                          className="h-8"
                        />
                      )}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`split-${index}-notes`} className="text-xs">
                      Notes
                    </Label>
                    <Input
                      id={`split-${index}-notes`}
                      placeholder="Optional"
                      className="h-8"
                      {...register(`splits.${index}.notes`)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {errors.splits && (
            <p className="text-destructive text-sm">
              {typeof errors.splits === 'object' && 'message' in errors.splits
                ? errors.splits.message
                : 'Split amounts must sum to the total'}
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="expense-date">Transaction date</Label>
        <Controller
          control={control}
          name="transactionDate"
          render={({ field }) => (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="expense-date"
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 size-4" />
                  {field.value
                    ? formatTransactionDate(field.value)
                    : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value ? parseISO(field.value) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      field.onChange(format(date, 'yyyy-MM-dd'));
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="expense-fixed">Fixed expense</Label>
        <Controller
          control={control}
          name="isFixed"
          render={({ field }) => (
            <Switch
              id="expense-fixed"
              checked={field.value ?? false}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="expense-notes">Notes (optional)</Label>
        <Input
          id="expense-notes"
          placeholder="Any additional notes..."
          {...register('notes')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="expense-attachments">Receipts & attachments</Label>
        <input
          id="expense-attachments"
          type="file"
          multiple
          onChange={handleAddAttachments}
          className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80"
          aria-label="Add receipt or attachment files"
        />
        {visibleExistingAttachments.length === 0 &&
          newAttachments.length === 0 && (
            <p className="text-muted-foreground text-xs">
              Add receipts, invoices, or supporting documents.
            </p>
          )}
        {(visibleExistingAttachments.length > 0 ||
          newAttachments.length > 0) && (
          <div className="space-y-2">
            {visibleExistingAttachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Paperclip className="text-muted-foreground size-4" />
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {attachment.fileName}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {formatFileSize(attachment.size)}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      handleViewAttachment(attachment.blob, attachment.fileName)
                    }
                  >
                    View
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      handleRemoveExistingAttachment(attachment.id)
                    }
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
            {newAttachments.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Paperclip className="text-muted-foreground size-4" />
                  <div className="min-w-0">
                    <div className="truncate font-medium">{file.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {formatFileSize(file.size)}
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveNewAttachment(index)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1"
          disabled={isSubmitting || (isSplit && !splitsMatch)}
        >
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          {expense ? 'Save changes' : 'Add expense'}
        </Button>
      </div>
    </form>
  );
}
