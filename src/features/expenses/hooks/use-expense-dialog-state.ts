import { useCallback, useState } from 'react';

import type { ExpenseItem } from '@/domain/plan';

import { DEFAULT_BULK_EDIT_VALUES } from '../constants';
import type { BulkEditValues } from '../types';

export function useExpenseDialogState() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(
    null,
  );
  const [deletingExpense, setDeletingExpense] = useState<ExpenseItem | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<string>('expenses');
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkEditValues, setBulkEditValues] = useState<BulkEditValues>(
    DEFAULT_BULK_EDIT_VALUES,
  );

  const openAdd = useCallback(() => {
    setEditingExpense(null);
    setSheetOpen(true);
  }, []);

  const openEdit = useCallback((expense: ExpenseItem) => {
    setEditingExpense(expense);
    setSheetOpen(true);
  }, []);

  return {
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
  };
}
