import type { MultiSelectOption } from '@/components/forms/multi-select';
import { CATEGORY_LABELS } from '@/lib/constants';
import type { BulkEditValues, SortField } from './types';

export const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'amount', label: 'Amount' },
  { value: 'category', label: 'Category' },
  { value: 'transactionDate', label: 'Transaction date' },
  { value: 'createdAt', label: 'Date added' },
];

export const DEFAULT_BULK_EDIT_VALUES: BulkEditValues = {
  category: 'no_change',
  bucketId: 'no_change',
  frequency: 'no_change',
  fixed: 'no_change',
};

export const SEARCH_DEBOUNCE_MS = 300;

export const CATEGORY_OPTIONS: MultiSelectOption[] = Object.entries(
  CATEGORY_LABELS,
).map(([value, label]) => ({
  value,
  label,
}));
