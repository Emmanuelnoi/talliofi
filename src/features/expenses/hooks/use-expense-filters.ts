import { useCallback, useMemo, useState } from 'react';
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  useQueryStates,
} from 'nuqs';
import { dollarsToCents } from '@/domain/money';
import { normalizeToMonthly } from '@/domain/plan';
import type { BucketAllocation, ExpenseItem } from '@/domain/plan';
import type { MultiSelectOption } from '@/components/forms/multi-select';
import { useDebounce } from '@/hooks/use-debounce';
import { CATEGORY_OPTIONS, SEARCH_DEBOUNCE_MS } from '../constants';
import { CATEGORY_LABELS } from '@/lib/constants';
import { matchesSearch } from '@/lib/highlight-text';
import type { ExpenseFiltersState, SortField } from '../types';

interface UseExpenseFiltersParams {
  expenses: ExpenseItem[];
  buckets: BucketAllocation[];
  isMobile: boolean;
}

export function useExpenseFilters({
  expenses,
  buckets,
  isMobile,
}: UseExpenseFiltersParams) {
  const [filtersExpanded, setFiltersExpanded] = useState(() => !isMobile);

  const [filters, setFiltersRaw] = useQueryStates({
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

  const setFilters = useCallback(
    (updates: Partial<ExpenseFiltersState>) => {
      void setFiltersRaw(updates);
    },
    [setFiltersRaw],
  );

  const debouncedSearch = useDebounce(filters.q, SEARCH_DEBOUNCE_MS);

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

  const clearAllFilters = useCallback(() => {
    setFilters({
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
    setFilters({ q: '' });
  }, [setFilters]);

  const clearCategories = useCallback(() => {
    setFilters({ categories: [] });
  }, [setFilters]);

  const clearBuckets = useCallback(() => {
    setFilters({ buckets: [] });
  }, [setFilters]);

  const clearFrequency = useCallback(() => {
    setFilters({ frequency: '' });
  }, [setFilters]);

  const clearFixed = useCallback(() => {
    setFilters({ fixed: '' });
  }, [setFilters]);

  const clearAmountRange = useCallback(() => {
    setFilters({ minAmount: 0, maxAmount: 0 });
  }, [setFilters]);

  const clearDateRange = useCallback(() => {
    setFilters({ dateFrom: '', dateTo: '' });
  }, [setFilters]);

  const bucketMap = useMemo(() => {
    const map = new Map<string, BucketAllocation>();
    for (const bucket of buckets) {
      map.set(bucket.id, bucket);
    }
    return map;
  }, [buckets]);

  const bucketOptions: MultiSelectOption[] = useMemo(
    () =>
      buckets.map((bucket) => ({
        value: bucket.id,
        label: bucket.name,
        color: bucket.color,
      })),
    [buckets],
  );

  const filteredExpenses = useMemo(() => {
    let result = [...expenses];

    if (debouncedSearch.trim()) {
      result = result.filter((expense) => {
        const bucket = bucketMap.get(expense.bucketId);
        const categoryLabel = CATEGORY_LABELS[expense.category];
        return matchesSearch(
          debouncedSearch,
          expense.name,
          expense.notes,
          categoryLabel,
          bucket?.name,
        );
      });
    }

    if (filters.categories.length > 0) {
      const categorySet = new Set(filters.categories);
      result = result.filter((expense) => categorySet.has(expense.category));
    }

    if (filters.buckets.length > 0) {
      const bucketSet = new Set(filters.buckets);
      result = result.filter((expense) => bucketSet.has(expense.bucketId));
    }

    if (filters.frequency) {
      result = result.filter(
        (expense) => expense.frequency === filters.frequency,
      );
    }

    if (filters.fixed === 'true') {
      result = result.filter((expense) => expense.isFixed);
    } else if (filters.fixed === 'false') {
      result = result.filter((expense) => !expense.isFixed);
    }

    if (filters.minAmount > 0) {
      const minCents = dollarsToCents(filters.minAmount);
      result = result.filter((expense) => {
        const monthly = normalizeToMonthly(
          expense.amountCents,
          expense.frequency,
        );
        return monthly >= minCents;
      });
    }

    if (filters.maxAmount > 0) {
      const maxCents = dollarsToCents(filters.maxAmount);
      result = result.filter((expense) => {
        const monthly = normalizeToMonthly(
          expense.amountCents,
          expense.frequency,
        );
        return monthly <= maxCents;
      });
    }

    if (filters.dateFrom) {
      result = result.filter((expense) => {
        if (!expense.transactionDate) return false;
        return expense.transactionDate >= filters.dateFrom;
      });
    }

    if (filters.dateTo) {
      result = result.filter((expense) => {
        if (!expense.transactionDate) return false;
        return expense.transactionDate <= filters.dateTo;
      });
    }

    const sortField = (filters.sort || 'name') as SortField;
    result.sort((a, b) => {
      switch (sortField) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'amount': {
          const aMonthly = normalizeToMonthly(a.amountCents, a.frequency);
          const bMonthly = normalizeToMonthly(b.amountCents, b.frequency);
          return bMonthly - aMonthly;
        }
        case 'category':
          return a.category.localeCompare(b.category);
        case 'transactionDate': {
          const aDate = a.transactionDate ?? '';
          const bDate = b.transactionDate ?? '';
          if (!aDate && !bDate) return 0;
          if (!aDate) return 1;
          if (!bDate) return -1;
          return bDate.localeCompare(aDate);
        }
        case 'createdAt':
          return b.createdAt.localeCompare(a.createdAt);
        default:
          return 0;
      }
    });

    return result;
  }, [expenses, debouncedSearch, bucketMap, filters]);

  return {
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
    categoryOptions: CATEGORY_OPTIONS,
    bucketOptions,
  };
}
