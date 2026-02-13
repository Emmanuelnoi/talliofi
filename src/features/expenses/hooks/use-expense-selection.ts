import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ExpenseItem } from '@/domain/plan';

interface UseExpenseSelectionParams {
  expenses: ExpenseItem[];
  filteredExpenses: ExpenseItem[];
}

export function useExpenseSelection({
  expenses,
  filteredExpenses,
}: UseExpenseSelectionParams) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);

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

  return {
    selectAllRef,
    selectedIds,
    setSelectedIds,
    validSelectedIds,
    selectedExpenses,
    selectedCount,
    selectedVisibleCount,
    allVisibleSelected,
    hasSelection,
    handleToggleSelect,
    handleToggleSelectAllVisible,
    handleClearSelection,
  };
}
