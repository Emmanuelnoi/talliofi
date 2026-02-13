import { useCallback, useMemo } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DEFAULT_CURRENCY, dollarsToCents } from '@/domain/money';
import type {
  ExpenseCategory,
  ExpenseItem,
  ExpenseSplit,
  Frequency,
  Plan,
} from '@/domain/plan';
import { recurringService } from '@/services/recurring-service';
import { getErrorMessage } from '@/lib/error-message';
import { attachmentRepo } from '@/data/repos/attachment-repo';
import { DEFAULT_BULK_EDIT_VALUES } from '../constants';
import { getTodayISODate } from '../utils/date-utils';
import type {
  BulkEditValues,
  ExpenseAttachmentPayload,
  ExpenseFormData,
} from '../types';

interface Mutation<TInput, TResult = unknown> {
  mutateAsync: (input: TInput) => Promise<TResult>;
  isPending: boolean;
}

interface UseExpenseActionsParams {
  plan: Plan | null;
  editingExpense: ExpenseItem | null;
  deletingExpense: ExpenseItem | null;
  selectedExpenses: ExpenseItem[];
  validSelectedIds: Set<string>;
  bulkEditValues: BulkEditValues;
  queryClient: QueryClient;
  scheduleVaultSave: () => void;
  setSheetOpen: (open: boolean) => void;
  setEditingExpense: (expense: ExpenseItem | null) => void;
  setDeletingExpense: (expense: ExpenseItem | null) => void;
  setBulkEditOpen: (open: boolean) => void;
  setBulkDeleteOpen: (open: boolean) => void;
  setBulkEditValues: (values: BulkEditValues) => void;
  setSelectedIds: (ids: Set<string>) => void;
  onSwitchToTemplatesTab: () => void;
  createExpense: Mutation<ExpenseItem>;
  updateExpense: Mutation<ExpenseItem>;
  deleteExpense: Mutation<{ id: string; planId: string }>;
  bulkUpdateExpenses: Mutation<ExpenseItem[]>;
  bulkDeleteExpenses: Mutation<{ ids: string[]; planId: string }>;
}

export function useExpenseActions({
  plan,
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
  onSwitchToTemplatesTab,
  createExpense,
  updateExpense,
  deleteExpense,
  bulkUpdateExpenses,
  bulkDeleteExpenses,
}: UseExpenseActionsParams) {
  const selectedSplitCount = useMemo(
    () => selectedExpenses.filter((expense) => expense.isSplit).length,
    [selectedExpenses],
  );

  const bulkEditHasChanges = useMemo(
    () =>
      bulkEditValues.category !== 'no_change' ||
      bulkEditValues.bucketId !== 'no_change' ||
      bulkEditValues.frequency !== 'no_change' ||
      bulkEditValues.fixed !== 'no_change',
    [bulkEditValues],
  );

  const handleSave = useCallback(
    async (
      data: ExpenseFormData,
      attachmentPayload: ExpenseAttachmentPayload,
    ) => {
      if (!plan) return;
      const now = new Date().toISOString();

      const splits: ExpenseSplit[] | undefined =
        data.isSplit && data.splits && data.splits.length >= 2
          ? data.splits.map((split) => ({
              bucketId: split.bucketId,
              category: split.category,
              amountCents: dollarsToCents(split.amountDollars),
              notes: split.notes,
            }))
          : undefined;

      let primaryBucketId = data.bucketId;
      let primaryCategory = data.category;
      if (splits && splits.length > 0) {
        const largestSplit = splits.reduce((prev, current) =>
          current.amountCents > prev.amountCents ? current : prev,
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
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to save expense.'));
      }
    },
    [
      createExpense,
      editingExpense,
      plan,
      queryClient,
      scheduleVaultSave,
      setEditingExpense,
      setSheetOpen,
      updateExpense,
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
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete expense.'));
    }
  }, [deleteExpense, deletingExpense, plan, setDeletingExpense]);

  const handleBulkEditApply = useCallback(async () => {
    if (!plan || selectedExpenses.length === 0 || !bulkEditHasChanges) return;

    const updatedExpenses = selectedExpenses.map((expense) => ({
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
    }));

    try {
      await bulkUpdateExpenses.mutateAsync(updatedExpenses);
      toast.success(`Updated ${updatedExpenses.length} expense(s)`);
      setBulkEditOpen(false);
      setBulkEditValues(DEFAULT_BULK_EDIT_VALUES);
      setSelectedIds(new Set());
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update expenses.'));
    }
  }, [
    bulkEditHasChanges,
    bulkEditValues,
    bulkUpdateExpenses,
    plan,
    selectedExpenses,
    setBulkEditOpen,
    setBulkEditValues,
    setSelectedIds,
  ]);

  const handleBulkDelete = useCallback(async () => {
    if (!plan || validSelectedIds.size === 0) return;
    const ids = Array.from(validSelectedIds);
    try {
      await bulkDeleteExpenses.mutateAsync({ ids, planId: plan.id });
      toast.success(`Deleted ${ids.length} expense(s)`);
      setBulkDeleteOpen(false);
      setSelectedIds(new Set());
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete expenses.'));
    }
  }, [
    bulkDeleteExpenses,
    plan,
    setBulkDeleteOpen,
    setSelectedIds,
    validSelectedIds,
  ]);

  const handleSaveAsTemplate = useCallback(
    async (expense: ExpenseItem) => {
      try {
        let dayOfMonth: number | undefined;
        if (expense.transactionDate) {
          dayOfMonth = new Date(expense.transactionDate).getDate();
        }
        await recurringService.createTemplateFromExpense(expense, dayOfMonth);
        scheduleVaultSave();
        toast.success(`Created template from "${expense.name}"`);
        onSwitchToTemplatesTab();
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to create template.'));
      }
    },
    [onSwitchToTemplatesTab, scheduleVaultSave],
  );

  return {
    selectedSplitCount,
    bulkEditHasChanges,
    handleSave,
    handleDelete,
    handleBulkEditApply,
    handleBulkDelete,
    handleSaveAsTemplate,
  };
}
