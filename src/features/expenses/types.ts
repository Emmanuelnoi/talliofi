import type { z } from 'zod';
import type { ExpenseCategory, Frequency } from '@/domain/plan';
import { ExpenseFormSchema } from '@/domain/plan/schemas';

export type ExpenseFormData = z.infer<typeof ExpenseFormSchema>;
export type ExpenseSplitForm = NonNullable<ExpenseFormData['splits']>[number];

export type SortField =
  | 'name'
  | 'amount'
  | 'category'
  | 'transactionDate'
  | 'createdAt';

export type BulkEditFixedOption = 'no_change' | 'fixed' | 'variable';
export type BulkEditValue<T extends string> = T | 'no_change';

export interface BulkEditValues {
  category: BulkEditValue<ExpenseCategory>;
  bucketId: BulkEditValue<string>;
  frequency: BulkEditValue<Frequency>;
  fixed: BulkEditFixedOption;
}

export interface ExpenseAttachmentPayload {
  newFiles: File[];
  removedIds: string[];
}

export interface ExpenseFiltersState {
  q: string;
  categories: string[];
  buckets: string[];
  frequency: string;
  fixed: string;
  minAmount: number;
  maxAmount: number;
  dateFrom: string;
  dateTo: string;
  sort: string;
}
