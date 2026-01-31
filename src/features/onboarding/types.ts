import type { z } from 'zod';
import type {
  IncomeInputSchema,
  TaxSimpleInputSchema,
  BucketInputSchema,
  CreateExpenseInputSchema,
} from '@/domain/plan/schemas';

export type IncomeFormData = z.infer<typeof IncomeInputSchema>;
export type TaxFormData = z.infer<typeof TaxSimpleInputSchema>;
export type BucketFormData = z.infer<typeof BucketInputSchema>;
export type ExpenseFormData = z.infer<typeof CreateExpenseInputSchema>;

export interface OnboardingData {
  income: IncomeFormData;
  tax: TaxFormData;
  buckets: BucketFormData[];
  expenses: ExpenseFormData[];
}
