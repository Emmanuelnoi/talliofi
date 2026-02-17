import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Receipt, RefreshCw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { PageHeader } from '@/components/layout/page-header';
import { DEFAULT_CURRENCY, addMoney, cents, formatMoney } from '@/domain/money';
import { normalizeToMonthly } from '@/domain/plan';
import { useActivePlan } from '@/hooks/use-active-plan';
import {
  useBuckets,
  useExchangeRates,
  useExpenses,
  useRecurringTemplates,
} from '@/hooks/use-plan-data';
import {
  useBulkDeleteExpenses,
  useBulkUpdateExpenses,
  useCreateExpense,
  useDeleteExpense,
  useUpdateExpense,
} from '@/hooks/use-plan-mutations';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLocalEncryption } from '@/hooks/use-local-encryption';
import { convertExpenseToBase } from '@/lib/currency-conversion';
import { TemplatesSection } from '@/features/recurring-templates';
import { attachmentRepo } from '@/data/repos/attachment-repo';
import { useCurrencyStore } from '@/stores/currency-store';
import { DEFAULT_BULK_EDIT_VALUES, SORT_OPTIONS } from '../constants';
import { ExpensesBulkEditDialog } from '../components/expenses-bulk-edit-dialog';
import {
  ExpenseDeleteDialog,
  ExpensesBulkDeleteDialog,
} from '../components/expenses-delete-dialogs';
import { ExpenseForm } from '../components/expense-form';
import { ExpensesFilterPanel } from '../components/expenses-filter-panel';
import { ExpensesList } from '../components/expenses-list';
import { ExpensesSelectionToolbar } from '../components/expenses-selection-toolbar';
import { useExpenseActions } from '../hooks/use-expense-actions';
import { useExpenseDialogState } from '../hooks/use-expense-dialog-state';
import { useExpenseFilters } from '../hooks/use-expense-filters';
import { useExpenseSelection } from '../hooks/use-expense-selection';

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

  const {
    sheetOpen,
    setSheetOpen,
    editingExpense,
    setEditingExpense,
    deletingExpense,
    setDeletingExpense,
    activeTab,
    setActiveTab,
    bulkEditOpen,
    setBulkEditOpen,
    bulkDeleteOpen,
    setBulkDeleteOpen,
    bulkEditValues,
    setBulkEditValues,
    openAdd,
    openEdit,
  } = useExpenseDialogState();

  useEffect(() => {
    const handleFocusSearch = () => {
      searchInputRef.current?.focus();
    };
    document.addEventListener('app:focus-search', handleFocusSearch);
    return () => {
      document.removeEventListener('app:focus-search', handleFocusSearch);
    };
  }, []);

  const {
    filters,
    setFilters,
    filtersExpanded,
    setFiltersExpanded,
    debouncedSearch,
    activeFilterCount,
    hasActiveFilters,
    clearAllFilters,
    clearSearch,
    clearCategories,
    clearBuckets,
    clearFrequency,
    clearFixed,
    clearAmountRange,
    clearDateRange,
    bucketMap,
    filteredExpenses,
    categoryOptions,
    bucketOptions,
  } = useExpenseFilters({ expenses, buckets, isMobile });

  const {
    selectAllRef,
    setSelectedIds,
    validSelectedIds,
    selectedExpenses,
    selectedCount,
    allVisibleSelected,
    hasSelection,
    handleToggleSelect,
    handleToggleSelectAllVisible,
    handleClearSelection,
  } = useExpenseSelection({ expenses, filteredExpenses });

  const [bulkDeleteAttachmentCount, setBulkDeleteAttachmentCount] = useState(0);
  useEffect(() => {
    if (!bulkDeleteOpen) {
      setBulkDeleteAttachmentCount(0); // eslint-disable-line react-hooks/set-state-in-effect -- reset on close
      return;
    }
    const ids = Array.from(validSelectedIds);
    if (ids.length === 0) return;

    let cancelled = false;
    attachmentRepo.countByExpenseIds(ids).then((count) => {
      if (!cancelled) setBulkDeleteAttachmentCount(count);
    });
    return () => {
      cancelled = true;
    };
  }, [bulkDeleteOpen, validSelectedIds]);

  const handleTabChange = useCallback(
    (value: string) => {
      setActiveTab(value);
      if (value !== 'expenses') {
        setSelectedIds(new Set());
      }
    },
    [setActiveTab, setSelectedIds],
  );

  const {
    selectedSplitCount,
    bulkEditHasChanges,
    handleSave,
    handleDelete,
    handleBulkEditApply,
    handleBulkDelete,
    handleSaveAsTemplate,
  } = useExpenseActions({
    plan: plan ?? null,
    editingExpense,
    deletingExpense,
    selectedExpenses,
    validSelectedIds,
    bulkEditValues,
    queryClient,
    scheduleVaultSave,
    setSheetOpen,
    setEditingExpense,
    setDeletingExpense,
    setBulkEditOpen,
    setBulkDeleteOpen,
    setBulkEditValues,
    setSelectedIds,
    onSwitchToTemplatesTab: () => handleTabChange('templates'),
    createExpense,
    updateExpense,
    deleteExpense,
    bulkUpdateExpenses,
    bulkDeleteExpenses,
  });

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
  }, [exchangeRates, filteredExpenses, plan?.currencyCode]);

  const isLoading = planLoading || expensesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-muted-foreground size-6 motion-safe:animate-spin" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Expenses"
          description="Complete onboarding to start tracking expenses."
          eyebrow="Transactions"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Expenses"
        description="Track and manage your recurring expenses."
        eyebrow="Transactions"
        action={
          activeTab === 'expenses' ? (
            <Button size="sm" onClick={openAdd}>
              <Plus className="size-4" />
              Add Expense
            </Button>
          ) : undefined
        }
      />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="expenses">
            <Receipt className="size-4" />
            Expenses
            {expenses.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {expenses.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="templates">
            <RefreshCw className="size-4" />
            Templates
            {templates.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {templates.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-8">
          <ExpensesFilterPanel
            expensesCount={expenses.length}
            buckets={buckets}
            filters={filters}
            setFilters={setFilters}
            searchInputRef={searchInputRef}
            debouncedSearch={debouncedSearch}
            activeFilterCount={activeFilterCount}
            hasActiveFilters={hasActiveFilters}
            filtersExpanded={filtersExpanded}
            onFiltersExpandedChange={setFiltersExpanded}
            categoryOptions={categoryOptions}
            bucketOptions={bucketOptions}
            bucketMap={bucketMap}
            sortOptions={SORT_OPTIONS}
            clearAllFilters={clearAllFilters}
            clearSearch={clearSearch}
            clearCategories={clearCategories}
            clearBuckets={clearBuckets}
            clearFrequency={clearFrequency}
            clearFixed={clearFixed}
            clearAmountRange={clearAmountRange}
            clearDateRange={clearDateRange}
          />

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

          <ExpensesSelectionToolbar
            filteredCount={filteredExpenses.length}
            selectedCount={selectedCount}
            allVisibleSelected={allVisibleSelected}
            hasSelection={hasSelection}
            selectAllRef={selectAllRef}
            onToggleSelectAllVisible={handleToggleSelectAllVisible}
            onOpenBulkEdit={() => {
              setBulkEditValues(DEFAULT_BULK_EDIT_VALUES);
              setBulkEditOpen(true);
            }}
            onOpenBulkDelete={() => setBulkDeleteOpen(true)}
            onClearSelection={handleClearSelection}
          />

          <ExpensesList
            expenses={expenses}
            filteredExpenses={filteredExpenses}
            bucketMap={bucketMap}
            searchQuery={debouncedSearch}
            activeFilterCount={activeFilterCount}
            selectedIds={validSelectedIds}
            onOpenAdd={openAdd}
            onOpenEdit={openEdit}
            onDelete={setDeletingExpense}
            onSaveAsTemplate={handleSaveAsTemplate}
            onToggleSelect={handleToggleSelect}
            onClearAllFilters={clearAllFilters}
          />
        </TabsContent>

        <TabsContent value="templates" className="space-y-8">
          <TemplatesSection planId={plan.id} buckets={buckets} />
        </TabsContent>
      </Tabs>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-hidden">
          <SheetHeader>
            <SheetTitle>
              {editingExpense ? 'Edit Expense' : 'New Expense'}
            </SheetTitle>
            <SheetDescription>
              {editingExpense
                ? 'Update this recurring expense.'
                : 'Add a new recurring expense to your budget.'}
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ExpenseForm
              key={editingExpense?.id ?? 'new'}
              expense={editingExpense}
              buckets={buckets}
              onSave={handleSave}
              onCancel={() => setSheetOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <ExpensesBulkEditDialog
        open={bulkEditOpen}
        selectedCount={selectedCount}
        selectedSplitCount={selectedSplitCount}
        bulkEditValues={bulkEditValues}
        buckets={buckets}
        hasChanges={bulkEditHasChanges}
        isApplying={bulkUpdateExpenses.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setBulkEditValues(DEFAULT_BULK_EDIT_VALUES);
          }
          setBulkEditOpen(open);
        }}
        onBulkEditValuesChange={setBulkEditValues}
        onApply={handleBulkEditApply}
      />

      <ExpensesBulkDeleteDialog
        open={bulkDeleteOpen}
        selectedCount={selectedCount}
        attachmentCount={bulkDeleteAttachmentCount}
        isDeleting={bulkDeleteExpenses.isPending}
        onOpenChange={setBulkDeleteOpen}
        onConfirm={handleBulkDelete}
      />

      <ExpenseDeleteDialog
        expense={deletingExpense}
        open={!!deletingExpense}
        onOpenChange={(open) => {
          if (!open) setDeletingExpense(null);
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}
