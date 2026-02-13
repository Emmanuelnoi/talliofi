import { useEffect, useMemo, useRef, useState } from 'react';
import { Receipt, Search } from 'lucide-react';
import { normalizeToMonthly } from '@/domain/plan';
import type { BucketAllocation, ExpenseItem } from '@/domain/plan';
import { EmptyState } from '@/components/feedback/empty-state';
import { ExpenseCard } from './expense-card';
import { getNoResultsDescription } from '../utils/filter-utils';

const VIRTUALIZATION_THRESHOLD = 200;
const ESTIMATED_ROW_HEIGHT = 132;
const OVERSCAN = 8;

interface ExpensesListProps {
  expenses: ExpenseItem[];
  filteredExpenses: ExpenseItem[];
  bucketMap: Map<string, BucketAllocation>;
  searchQuery: string;
  activeFilterCount: number;
  selectedIds: Set<string>;
  onOpenAdd: () => void;
  onOpenEdit: (expense: ExpenseItem) => void;
  onDelete: (expense: ExpenseItem) => void;
  onSaveAsTemplate: (expense: ExpenseItem) => void;
  onToggleSelect: (expenseId: string, checked: boolean) => void;
  onClearAllFilters: () => void;
}

export function ExpensesList({
  expenses,
  filteredExpenses,
  bucketMap,
  searchQuery,
  activeFilterCount,
  selectedIds,
  onOpenAdd,
  onOpenEdit,
  onDelete,
  onSaveAsTemplate,
  onToggleSelect,
  onClearAllFilters,
}: ExpensesListProps) {
  if (expenses.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="No expenses yet"
        description="Add your recurring expenses to start tracking your budget."
        action={{
          label: 'Add your first expense',
          onClick: onOpenAdd,
        }}
      />
    );
  }

  if (filteredExpenses.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title="No matching expenses"
        description={getNoResultsDescription(searchQuery, activeFilterCount)}
        action={{
          label: 'Clear all filters',
          onClick: onClearAllFilters,
        }}
      />
    );
  }

  const shouldVirtualize = filteredExpenses.length >= VIRTUALIZATION_THRESHOLD;

  if (!shouldVirtualize) {
    return (
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
              searchQuery={searchQuery}
              onEdit={() => onOpenEdit(expense)}
              onDelete={() => onDelete(expense)}
              onSaveAsTemplate={() => onSaveAsTemplate(expense)}
              selected={selectedIds.has(expense.id)}
              onToggleSelected={(checked) =>
                onToggleSelect(expense.id, checked)
              }
            />
          );
        })}
      </div>
    );
  }

  return (
    <VirtualizedExpenseList
      expenses={filteredExpenses}
      bucketMap={bucketMap}
      searchQuery={searchQuery}
      selectedIds={selectedIds}
      onOpenEdit={onOpenEdit}
      onDelete={onDelete}
      onSaveAsTemplate={onSaveAsTemplate}
      onToggleSelect={onToggleSelect}
    />
  );
}

interface VirtualizedExpenseListProps {
  expenses: ExpenseItem[];
  bucketMap: Map<string, BucketAllocation>;
  searchQuery: string;
  selectedIds: Set<string>;
  onOpenEdit: (expense: ExpenseItem) => void;
  onDelete: (expense: ExpenseItem) => void;
  onSaveAsTemplate: (expense: ExpenseItem) => void;
  onToggleSelect: (expenseId: string, checked: boolean) => void;
}

function VirtualizedExpenseList({
  expenses,
  bucketMap,
  searchQuery,
  selectedIds,
  onOpenEdit,
  onDelete,
  onSaveAsTemplate,
  onToggleSelect,
}: VirtualizedExpenseListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(640);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateHeight = () => {
      setViewportHeight(element.clientHeight);
    };

    updateHeight();
    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const totalCount = expenses.length;
  const startIndex = Math.max(
    0,
    Math.floor(scrollTop / ESTIMATED_ROW_HEIGHT) - OVERSCAN,
  );
  const visibleCount =
    Math.ceil(viewportHeight / ESTIMATED_ROW_HEIGHT) + OVERSCAN * 2;
  const endIndex = Math.min(totalCount, startIndex + visibleCount);

  const topPadding = startIndex * ESTIMATED_ROW_HEIGHT;
  const bottomPadding = Math.max(
    0,
    (totalCount - endIndex) * ESTIMATED_ROW_HEIGHT,
  );

  const visibleExpenses = useMemo(
    () => expenses.slice(startIndex, endIndex),
    [expenses, startIndex, endIndex],
  );

  return (
    <div
      ref={containerRef}
      className="max-h-[70vh] space-y-3 overflow-y-auto pr-1"
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      aria-label="Virtualized expenses list"
    >
      {topPadding > 0 && (
        <div style={{ height: topPadding }} aria-hidden="true" />
      )}
      <div className="space-y-3">
        {visibleExpenses.map((expense) => {
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
              searchQuery={searchQuery}
              onEdit={() => onOpenEdit(expense)}
              onDelete={() => onDelete(expense)}
              onSaveAsTemplate={() => onSaveAsTemplate(expense)}
              selected={selectedIds.has(expense.id)}
              onToggleSelected={(checked) =>
                onToggleSelect(expense.id, checked)
              }
            />
          );
        })}
      </div>
      {bottomPadding > 0 && (
        <div style={{ height: bottomPadding }} aria-hidden="true" />
      )}
    </div>
  );
}
