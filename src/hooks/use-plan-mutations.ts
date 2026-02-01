import { useMutation, useQueryClient } from '@tanstack/react-query';
import { planRepo } from '@/data/repos/plan-repo';
import { bucketRepo } from '@/data/repos/bucket-repo';
import { expenseRepo } from '@/data/repos/expense-repo';
import { taxComponentRepo } from '@/data/repos/tax-component-repo';
import type {
  Plan,
  BucketAllocation,
  ExpenseItem,
  TaxComponent,
} from '@/domain/plan';
import { ACTIVE_PLAN_QUERY_KEY } from './use-active-plan';

// --- Plan ---

export function useUpdatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (plan: Plan) => planRepo.update(plan),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ACTIVE_PLAN_QUERY_KEY });
    },
  });
}

// --- Buckets ---

export function useCreateBucket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bucket: BucketAllocation) => bucketRepo.create(bucket),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['buckets', variables.planId],
      });
    },
  });
}

export function useUpdateBucket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bucket: BucketAllocation) => bucketRepo.update(bucket),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['buckets', variables.planId],
      });
    },
  });
}

export function useDeleteBucket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; planId: string }) =>
      bucketRepo.delete(id),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['buckets', variables.planId],
      });
      // Expenses may have been reassigned, invalidate them too
      void queryClient.invalidateQueries({
        queryKey: ['expenses', variables.planId],
      });
    },
  });
}

// --- Expenses ---

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (expense: ExpenseItem) => expenseRepo.create(expense),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['expenses', variables.planId],
      });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (expense: ExpenseItem) => expenseRepo.update(expense),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['expenses', variables.planId],
      });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; planId: string }) =>
      expenseRepo.delete(id),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['expenses', variables.planId],
      });
    },
  });
}

// --- Tax Components ---

export function useCreateTaxComponent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (component: TaxComponent) => taxComponentRepo.create(component),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['tax-components', variables.planId],
      });
    },
  });
}

export function useUpdateTaxComponent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (component: TaxComponent) => taxComponentRepo.update(component),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['tax-components', variables.planId],
      });
    },
  });
}

export function useDeleteTaxComponent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; planId: string }) =>
      taxComponentRepo.delete(id),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['tax-components', variables.planId],
      });
    },
  });
}
