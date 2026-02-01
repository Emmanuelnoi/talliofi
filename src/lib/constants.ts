import type { Frequency, ExpenseCategory } from '@/domain/plan';

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  semimonthly: 'Semi-monthly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
};

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
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

export const BUCKET_COLORS = [
  '#4A90D9',
  '#50C878',
  '#FFB347',
  '#FF6B6B',
  '#9B59B6',
  '#1ABC9C',
  '#F39C12',
  '#E74C3C',
] as const;
