import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPlanRepo,
  getBucketRepo,
  getExpenseRepo,
  getGoalRepo,
  getAssetRepo,
  getLiabilityRepo,
  getTaxComponentRepo,
  getRecurringTemplateRepo,
} from '@/data/repos/repo-router';
import type {
  Plan,
  BucketAllocation,
  ExpenseItem,
  Goal,
  Asset,
  Liability,
  TaxComponent,
  RecurringTemplate,
} from '@/domain/plan';
import { queryKeys } from './query-keys';
import {
  recordChange,
  recordBulkChange,
  useCreateEntity,
  useUpdateEntity,
  useDeleteEntity,
  useVaultSaveOnSuccess,
} from '@/hooks/create-crud-mutations';

// --- Plan ---

export function useUpdatePlan() {
  const queryClient = useQueryClient();
  const scheduleVaultSave = useVaultSaveOnSuccess();
  return useMutation({
    mutationFn: (plan: Plan) => getPlanRepo().update(plan),
    onMutate: async (newPlan) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.activePlan });

      const previousPlan = queryClient.getQueryData<Plan | null>(
        queryKeys.activePlan,
      );

      queryClient.setQueryData<Plan | null>(queryKeys.activePlan, newPlan);

      return { previousPlan };
    },
    onError: (_err, _newPlan, context) => {
      if (context?.previousPlan !== undefined) {
        queryClient.setQueryData(queryKeys.activePlan, context.previousPlan);
      }
    },
    onSettled: (_data, error, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.activePlan });
      void queryClient.invalidateQueries({ queryKey: queryKeys.changelog });
      if (!error) {
        scheduleVaultSave();
        recordChange(
          variables.id,
          'plan',
          variables.id,
          'update',
          variables.name,
        );
      }
    },
  });
}

// --- Buckets ---

export const useCreateBucket = () =>
  useCreateEntity<BucketAllocation>({
    entityType: 'bucket',
    queryKey: queryKeys.buckets,
    repo: getBucketRepo(),
  });

export const useUpdateBucket = () =>
  useUpdateEntity<BucketAllocation>({
    entityType: 'bucket',
    queryKey: queryKeys.buckets,
    repo: getBucketRepo(),
  });

export function useDeleteBucket() {
  const queryClient = useQueryClient();
  const scheduleVaultSave = useVaultSaveOnSuccess();
  return useMutation({
    mutationFn: ({ id }: { id: string; planId: string }) =>
      getBucketRepo().delete(id),
    onMutate: async ({ id, planId }) => {
      const key = queryKeys.buckets(planId);
      await queryClient.cancelQueries({ queryKey: key });

      const previousBuckets = queryClient.getQueryData<BucketAllocation[]>(key);

      queryClient.setQueryData<BucketAllocation[]>(key, (old = []) =>
        old.filter((b) => b.id !== id),
      );

      return { previousBuckets, planId };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousBuckets !== undefined) {
        queryClient.setQueryData(
          queryKeys.buckets(context.planId),
          context.previousBuckets,
        );
      }
    },
    onSettled: (_data, error, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.buckets(variables.planId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.changelog });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.expenses(variables.planId),
      });
      if (!error) {
        scheduleVaultSave();
        recordChange(variables.planId, 'bucket', variables.id, 'delete');
      }
    },
  });
}

// --- Expenses ---

export const useCreateExpense = () =>
  useCreateEntity<ExpenseItem>({
    entityType: 'expense',
    queryKey: queryKeys.expenses,
    repo: getExpenseRepo(),
  });

export const useUpdateExpense = () =>
  useUpdateEntity<ExpenseItem>({
    entityType: 'expense',
    queryKey: queryKeys.expenses,
    repo: getExpenseRepo(),
  });

export const useDeleteExpense = () =>
  useDeleteEntity<ExpenseItem>({
    entityType: 'expense',
    queryKey: queryKeys.expenses,
    repo: getExpenseRepo(),
  });

export function useBulkUpdateExpenses() {
  const queryClient = useQueryClient();
  const scheduleVaultSave = useVaultSaveOnSuccess();
  return useMutation({
    mutationFn: (expenses: ExpenseItem[]) =>
      getExpenseRepo().bulkUpdate(expenses),
    onMutate: async (updatedExpenses) => {
      const planId = updatedExpenses[0]?.planId;
      if (!planId) return { previousExpenses: undefined, planId: '' };
      const key = queryKeys.expenses(planId);
      await queryClient.cancelQueries({ queryKey: key });

      const previousExpenses = queryClient.getQueryData<ExpenseItem[]>(key);

      const updates = new Map(updatedExpenses.map((e) => [e.id, e]));
      queryClient.setQueryData<ExpenseItem[]>(key, (old = []) =>
        old.map((expense) => updates.get(expense.id) ?? expense),
      );

      return { previousExpenses, planId };
    },
    onError: (_err, _expenses, context) => {
      if (context?.previousExpenses !== undefined) {
        queryClient.setQueryData(
          queryKeys.expenses(context.planId),
          context.previousExpenses,
        );
      }
    },
    onSettled: (_data, error, variables) => {
      const planId = variables[0]?.planId;
      if (!planId) return;
      void queryClient.invalidateQueries({
        queryKey: queryKeys.expenses(planId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.changelog });
      if (!error) {
        scheduleVaultSave();
        recordBulkChange(
          planId,
          'expense',
          variables.map((expense) => ({
            id: expense.id,
            name: expense.name,
          })),
          'update',
        );
      }
    },
  });
}

export function useBulkDeleteExpenses() {
  const queryClient = useQueryClient();
  const scheduleVaultSave = useVaultSaveOnSuccess();
  return useMutation({
    mutationFn: ({ ids }: { ids: string[]; planId: string }) =>
      getExpenseRepo().bulkDelete(ids),
    onMutate: async ({ ids, planId }) => {
      const key = queryKeys.expenses(planId);
      await queryClient.cancelQueries({ queryKey: key });

      const previousExpenses = queryClient.getQueryData<ExpenseItem[]>(key);
      const idSet = new Set(ids);

      queryClient.setQueryData<ExpenseItem[]>(key, (old = []) =>
        old.filter((expense) => !idSet.has(expense.id)),
      );

      return { previousExpenses, planId };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousExpenses !== undefined) {
        queryClient.setQueryData(
          queryKeys.expenses(context.planId),
          context.previousExpenses,
        );
      }
    },
    onSettled: (_data, error, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.expenses(variables.planId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.changelog });
      if (!error) {
        scheduleVaultSave();
        recordBulkChange(
          variables.planId,
          'expense',
          variables.ids.map((id) => ({ id })),
          'delete',
        );
      }
    },
  });
}

// --- Tax Components ---

export const useCreateTaxComponent = () =>
  useCreateEntity<TaxComponent>({
    entityType: 'tax_component',
    queryKey: queryKeys.taxComponents,
    repo: getTaxComponentRepo(),
  });

export const useUpdateTaxComponent = () =>
  useUpdateEntity<TaxComponent>({
    entityType: 'tax_component',
    queryKey: queryKeys.taxComponents,
    repo: getTaxComponentRepo(),
  });

export const useDeleteTaxComponent = () =>
  useDeleteEntity<TaxComponent>({
    entityType: 'tax_component',
    queryKey: queryKeys.taxComponents,
    repo: getTaxComponentRepo(),
  });

// --- Goals ---

export const useCreateGoal = () =>
  useCreateEntity<Goal>({
    entityType: 'goal',
    queryKey: queryKeys.goals,
    repo: getGoalRepo(),
  });

export const useUpdateGoal = () =>
  useUpdateEntity<Goal>({
    entityType: 'goal',
    queryKey: queryKeys.goals,
    repo: getGoalRepo(),
  });

export const useDeleteGoal = () =>
  useDeleteEntity<Goal>({
    entityType: 'goal',
    queryKey: queryKeys.goals,
    repo: getGoalRepo(),
  });

// --- Assets ---

export const useCreateAsset = () =>
  useCreateEntity<Asset>({
    entityType: 'asset',
    queryKey: queryKeys.assets,
    repo: getAssetRepo(),
  });

export const useUpdateAsset = () =>
  useUpdateEntity<Asset>({
    entityType: 'asset',
    queryKey: queryKeys.assets,
    repo: getAssetRepo(),
  });

export const useDeleteAsset = () =>
  useDeleteEntity<Asset>({
    entityType: 'asset',
    queryKey: queryKeys.assets,
    repo: getAssetRepo(),
  });

// --- Liabilities ---

export const useCreateLiability = () =>
  useCreateEntity<Liability>({
    entityType: 'liability',
    queryKey: queryKeys.liabilities,
    repo: getLiabilityRepo(),
  });

export const useUpdateLiability = () =>
  useUpdateEntity<Liability>({
    entityType: 'liability',
    queryKey: queryKeys.liabilities,
    repo: getLiabilityRepo(),
  });

export const useDeleteLiability = () =>
  useDeleteEntity<Liability>({
    entityType: 'liability',
    queryKey: queryKeys.liabilities,
    repo: getLiabilityRepo(),
  });

// --- Recurring Templates ---

export const useCreateRecurringTemplate = () =>
  useCreateEntity<RecurringTemplate>({
    entityType: 'recurring_template',
    queryKey: queryKeys.recurringTemplates,
    repo: getRecurringTemplateRepo(),
  });

export const useUpdateRecurringTemplate = () =>
  useUpdateEntity<RecurringTemplate>({
    entityType: 'recurring_template',
    queryKey: queryKeys.recurringTemplates,
    repo: getRecurringTemplateRepo(),
  });

export const useDeleteRecurringTemplate = () =>
  useDeleteEntity<RecurringTemplate>({
    entityType: 'recurring_template',
    queryKey: queryKeys.recurringTemplates,
    repo: getRecurringTemplateRepo(),
  });

export function useToggleRecurringTemplate() {
  const queryClient = useQueryClient();
  const scheduleVaultSave = useVaultSaveOnSuccess();
  return useMutation({
    mutationFn: ({ id }: { id: string; planId: string }) =>
      getRecurringTemplateRepo().toggleActive(id),
    onMutate: async ({ id, planId }) => {
      const key = queryKeys.recurringTemplates(planId);
      await queryClient.cancelQueries({ queryKey: key });

      const previousTemplates =
        queryClient.getQueryData<RecurringTemplate[]>(key);

      queryClient.setQueryData<RecurringTemplate[]>(key, (old = []) =>
        old.map((t) => (t.id === id ? { ...t, isActive: !t.isActive } : t)),
      );

      return { previousTemplates, planId };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTemplates !== undefined) {
        queryClient.setQueryData(
          queryKeys.recurringTemplates(context.planId),
          context.previousTemplates,
        );
      }
    },
    onSettled: (_data, error, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.recurringTemplates(variables.planId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.changelog });
      if (!error) {
        scheduleVaultSave();
        recordChange(
          variables.planId,
          'recurring_template',
          variables.id,
          'update',
        );
      }
    },
  });
}
