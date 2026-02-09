import { useMutation, useQueryClient } from '@tanstack/react-query';
import { planRepo } from '@/data/repos/plan-repo';
import { bucketRepo } from '@/data/repos/bucket-repo';
import { expenseRepo } from '@/data/repos/expense-repo';
import { goalRepo } from '@/data/repos/goal-repo';
import { assetRepo } from '@/data/repos/asset-repo';
import { liabilityRepo } from '@/data/repos/liability-repo';
import { taxComponentRepo } from '@/data/repos/tax-component-repo';
import { recurringTemplateRepo } from '@/data/repos/recurring-template-repo';
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
import { ACTIVE_PLAN_QUERY_KEY } from './use-active-plan';

// --- Query Keys ---
const bucketsKey = (planId: string) => ['buckets', planId] as const;
const expensesKey = (planId: string) => ['expenses', planId] as const;
const goalsKey = (planId: string) => ['goals', planId] as const;
const assetsKey = (planId: string) => ['assets', planId] as const;
const liabilitiesKey = (planId: string) => ['liabilities', planId] as const;
const taxComponentsKey = (planId: string) =>
  ['tax-components', planId] as const;
const recurringTemplatesKey = (planId: string) =>
  ['recurring-templates', planId] as const;

// --- Plan ---

export function useUpdatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (plan: Plan) => planRepo.update(plan),
    onMutate: async (newPlan) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ACTIVE_PLAN_QUERY_KEY });

      // Snapshot previous value
      const previousPlan = queryClient.getQueryData<Plan | null>(
        ACTIVE_PLAN_QUERY_KEY,
      );

      // Optimistically update
      queryClient.setQueryData<Plan | null>(ACTIVE_PLAN_QUERY_KEY, newPlan);

      return { previousPlan };
    },
    onError: (_err, _newPlan, context) => {
      // Rollback on error
      if (context?.previousPlan !== undefined) {
        queryClient.setQueryData(ACTIVE_PLAN_QUERY_KEY, context.previousPlan);
      }
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      void queryClient.invalidateQueries({ queryKey: ACTIVE_PLAN_QUERY_KEY });
    },
  });
}

// --- Buckets ---

export function useCreateBucket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bucket: BucketAllocation) => bucketRepo.create(bucket),
    onMutate: async (newBucket) => {
      const key = bucketsKey(newBucket.planId);
      await queryClient.cancelQueries({ queryKey: key });

      const previousBuckets = queryClient.getQueryData<BucketAllocation[]>(key);

      // Optimistically add the new bucket
      queryClient.setQueryData<BucketAllocation[]>(key, (old = []) => [
        ...old,
        newBucket,
      ]);

      return { previousBuckets, planId: newBucket.planId };
    },
    onError: (_err, _newBucket, context) => {
      if (context?.previousBuckets !== undefined) {
        queryClient.setQueryData(
          bucketsKey(context.planId),
          context.previousBuckets,
        );
      }
    },
    onSettled: (_data, _err, variables) => {
      void queryClient.invalidateQueries({
        queryKey: bucketsKey(variables.planId),
      });
    },
  });
}

export function useUpdateBucket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bucket: BucketAllocation) => bucketRepo.update(bucket),
    onMutate: async (updatedBucket) => {
      const key = bucketsKey(updatedBucket.planId);
      await queryClient.cancelQueries({ queryKey: key });

      const previousBuckets = queryClient.getQueryData<BucketAllocation[]>(key);

      // Optimistically update the bucket
      queryClient.setQueryData<BucketAllocation[]>(key, (old = []) =>
        old.map((b) => (b.id === updatedBucket.id ? updatedBucket : b)),
      );

      return { previousBuckets, planId: updatedBucket.planId };
    },
    onError: (_err, _bucket, context) => {
      if (context?.previousBuckets !== undefined) {
        queryClient.setQueryData(
          bucketsKey(context.planId),
          context.previousBuckets,
        );
      }
    },
    onSettled: (_data, _err, variables) => {
      void queryClient.invalidateQueries({
        queryKey: bucketsKey(variables.planId),
      });
    },
  });
}

export function useDeleteBucket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; planId: string }) =>
      bucketRepo.delete(id),
    onMutate: async ({ id, planId }) => {
      const key = bucketsKey(planId);
      await queryClient.cancelQueries({ queryKey: key });

      const previousBuckets = queryClient.getQueryData<BucketAllocation[]>(key);

      // Optimistically remove the bucket
      queryClient.setQueryData<BucketAllocation[]>(key, (old = []) =>
        old.filter((b) => b.id !== id),
      );

      return { previousBuckets, planId };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousBuckets !== undefined) {
        queryClient.setQueryData(
          bucketsKey(context.planId),
          context.previousBuckets,
        );
      }
    },
    onSettled: (_data, _err, variables) => {
      void queryClient.invalidateQueries({
        queryKey: bucketsKey(variables.planId),
      });
      // Expenses may have been reassigned, invalidate them too
      void queryClient.invalidateQueries({
        queryKey: expensesKey(variables.planId),
      });
    },
  });
}

// --- Expenses ---

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (expense: ExpenseItem) => expenseRepo.create(expense),
    onMutate: async (newExpense) => {
      const key = expensesKey(newExpense.planId);
      await queryClient.cancelQueries({ queryKey: key });

      const previousExpenses = queryClient.getQueryData<ExpenseItem[]>(key);

      // Optimistically add the new expense
      queryClient.setQueryData<ExpenseItem[]>(key, (old = []) => [
        ...old,
        newExpense,
      ]);

      return { previousExpenses, planId: newExpense.planId };
    },
    onError: (_err, _newExpense, context) => {
      if (context?.previousExpenses !== undefined) {
        queryClient.setQueryData(
          expensesKey(context.planId),
          context.previousExpenses,
        );
      }
    },
    onSettled: (_data, _err, variables) => {
      void queryClient.invalidateQueries({
        queryKey: expensesKey(variables.planId),
      });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (expense: ExpenseItem) => expenseRepo.update(expense),
    onMutate: async (updatedExpense) => {
      const key = expensesKey(updatedExpense.planId);
      await queryClient.cancelQueries({ queryKey: key });

      const previousExpenses = queryClient.getQueryData<ExpenseItem[]>(key);

      // Optimistically update the expense
      queryClient.setQueryData<ExpenseItem[]>(key, (old = []) =>
        old.map((e) => (e.id === updatedExpense.id ? updatedExpense : e)),
      );

      return { previousExpenses, planId: updatedExpense.planId };
    },
    onError: (_err, _expense, context) => {
      if (context?.previousExpenses !== undefined) {
        queryClient.setQueryData(
          expensesKey(context.planId),
          context.previousExpenses,
        );
      }
    },
    onSettled: (_data, _err, variables) => {
      void queryClient.invalidateQueries({
        queryKey: expensesKey(variables.planId),
      });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; planId: string }) =>
      expenseRepo.delete(id),
    onMutate: async ({ id, planId }) => {
      const key = expensesKey(planId);
      await queryClient.cancelQueries({ queryKey: key });

      const previousExpenses = queryClient.getQueryData<ExpenseItem[]>(key);

      // Optimistically remove the expense
      queryClient.setQueryData<ExpenseItem[]>(key, (old = []) =>
        old.filter((e) => e.id !== id),
      );

      return { previousExpenses, planId };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousExpenses !== undefined) {
        queryClient.setQueryData(
          expensesKey(context.planId),
          context.previousExpenses,
        );
      }
    },
    onSettled: (_data, _err, variables) => {
      void queryClient.invalidateQueries({
        queryKey: expensesKey(variables.planId),
      });
    },
  });
}

// --- Tax Components ---

export function useCreateTaxComponent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (component: TaxComponent) => taxComponentRepo.create(component),
    onMutate: async (newComponent) => {
      const key = taxComponentsKey(newComponent.planId);
      await queryClient.cancelQueries({ queryKey: key });

      const previousComponents = queryClient.getQueryData<TaxComponent[]>(key);

      // Optimistically add the new component
      queryClient.setQueryData<TaxComponent[]>(key, (old = []) => [
        ...old,
        newComponent,
      ]);

      return { previousComponents, planId: newComponent.planId };
    },
    onError: (_err, _newComponent, context) => {
      if (context?.previousComponents !== undefined) {
        queryClient.setQueryData(
          taxComponentsKey(context.planId),
          context.previousComponents,
        );
      }
    },
    onSettled: (_data, _err, variables) => {
      void queryClient.invalidateQueries({
        queryKey: taxComponentsKey(variables.planId),
      });
    },
  });
}

export function useUpdateTaxComponent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (component: TaxComponent) => taxComponentRepo.update(component),
    onMutate: async (updatedComponent) => {
      const key = taxComponentsKey(updatedComponent.planId);
      await queryClient.cancelQueries({ queryKey: key });

      const previousComponents = queryClient.getQueryData<TaxComponent[]>(key);

      // Optimistically update the component
      queryClient.setQueryData<TaxComponent[]>(key, (old = []) =>
        old.map((c) => (c.id === updatedComponent.id ? updatedComponent : c)),
      );

      return { previousComponents, planId: updatedComponent.planId };
    },
    onError: (_err, _component, context) => {
      if (context?.previousComponents !== undefined) {
        queryClient.setQueryData(
          taxComponentsKey(context.planId),
          context.previousComponents,
        );
      }
    },
    onSettled: (_data, _err, variables) => {
      void queryClient.invalidateQueries({
        queryKey: taxComponentsKey(variables.planId),
      });
    },
  });
}

export function useDeleteTaxComponent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; planId: string }) =>
      taxComponentRepo.delete(id),
    onMutate: async ({ id, planId }) => {
      const key = taxComponentsKey(planId);
      await queryClient.cancelQueries({ queryKey: key });

      const previousComponents = queryClient.getQueryData<TaxComponent[]>(key);

      // Optimistically remove the component
      queryClient.setQueryData<TaxComponent[]>(key, (old = []) =>
        old.filter((c) => c.id !== id),
      );

      return { previousComponents, planId };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousComponents !== undefined) {
        queryClient.setQueryData(
          taxComponentsKey(context.planId),
          context.previousComponents,
        );
      }
    },
    onSettled: (_data, _err, variables) => {
      void queryClient.invalidateQueries({
        queryKey: taxComponentsKey(variables.planId),
      });
    },
  });
}

// --- Goals ---

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (goal: Goal) => goalRepo.create(goal),
    onMutate: async (newGoal) => {
      const key = goalsKey(newGoal.planId);
      await queryClient.cancelQueries({ queryKey: key });

      const previousGoals = queryClient.getQueryData<Goal[]>(key);

      // Optimistically add the new goal
      queryClient.setQueryData<Goal[]>(key, (old = []) => [...old, newGoal]);

      return { previousGoals, planId: newGoal.planId };
    },
    onError: (_err, _newGoal, context) => {
      if (context?.previousGoals !== undefined) {
        queryClient.setQueryData(
          goalsKey(context.planId),
          context.previousGoals,
        );
      }
    },
    onSettled: (_data, _err, variables) => {
      void queryClient.invalidateQueries({
        queryKey: goalsKey(variables.planId),
      });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (goal: Goal) => goalRepo.update(goal),
    onMutate: async (updatedGoal) => {
      const key = goalsKey(updatedGoal.planId);
      await queryClient.cancelQueries({ queryKey: key });

      const previousGoals = queryClient.getQueryData<Goal[]>(key);

      // Optimistically update the goal
      queryClient.setQueryData<Goal[]>(key, (old = []) =>
        old.map((g) => (g.id === updatedGoal.id ? updatedGoal : g)),
      );

      return { previousGoals, planId: updatedGoal.planId };
    },
    onError: (_err, _goal, context) => {
      if (context?.previousGoals !== undefined) {
        queryClient.setQueryData(
          goalsKey(context.planId),
          context.previousGoals,
        );
      }
    },
    onSettled: (_data, _err, variables) => {
      void queryClient.invalidateQueries({
        queryKey: goalsKey(variables.planId),
      });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; planId: string }) => goalRepo.delete(id),
    onMutate: async ({ id, planId }) => {
      const key = goalsKey(planId);
      await queryClient.cancelQueries({ queryKey: key });

      const previousGoals = queryClient.getQueryData<Goal[]>(key);

      // Optimistically remove the goal
      queryClient.setQueryData<Goal[]>(key, (old = []) =>
        old.filter((g) => g.id !== id),
      );

      return { previousGoals, planId };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousGoals !== undefined) {
        queryClient.setQueryData(
          goalsKey(context.planId),
          context.previousGoals,
        );
      }
    },
    onSettled: (_data, _err, variables) => {
      void queryClient.invalidateQueries({
        queryKey: goalsKey(variables.planId),
      });
    },
  });
}

// --- Assets ---

export function useCreateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (asset: Asset) => assetRepo.create(asset),
    onMutate: async (newAsset) => {
      const key = assetsKey(newAsset.planId);
      await queryClient.cancelQueries({ queryKey: key });

      const previousAssets = queryClient.getQueryData<Asset[]>(key);

      // Optimistically add the new asset
      queryClient.setQueryData<Asset[]>(key, (old = []) => [...old, newAsset]);

      return { previousAssets, planId: newAsset.planId };
    },
    onError: (_err, _newAsset, context) => {
      if (context?.previousAssets !== undefined) {
        queryClient.setQueryData(
          assetsKey(context.planId),
          context.previousAssets,
        );
      }
    },
    onSettled: (_data, _err, variables) => {
      void queryClient.invalidateQueries({
        queryKey: assetsKey(variables.planId),
      });
    },
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (asset: Asset) => assetRepo.update(asset),
    onMutate: async (updatedAsset) => {
      const key = assetsKey(updatedAsset.planId);
      await queryClient.cancelQueries({ queryKey: key });

      const previousAssets = queryClient.getQueryData<Asset[]>(key);

      // Optimistically update the asset
      queryClient.setQueryData<Asset[]>(key, (old = []) =>
        old.map((a) => (a.id === updatedAsset.id ? updatedAsset : a)),
      );

      return { previousAssets, planId: updatedAsset.planId };
    },
    onError: (_err, _asset, context) => {
      if (context?.previousAssets !== undefined) {
        queryClient.setQueryData(
          assetsKey(context.planId),
          context.previousAssets,
        );
      }
    },
    onSettled: (_data, _err, variables) => {
      void queryClient.invalidateQueries({
        queryKey: assetsKey(variables.planId),
      });
    },
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; planId: string }) =>
      assetRepo.delete(id),
    onMutate: async ({ id, planId }) => {
      const key = assetsKey(planId);
      await queryClient.cancelQueries({ queryKey: key });

      const previousAssets = queryClient.getQueryData<Asset[]>(key);

      // Optimistically remove the asset
      queryClient.setQueryData<Asset[]>(key, (old = []) =>
        old.filter((a) => a.id !== id),
      );

      return { previousAssets, planId };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousAssets !== undefined) {
        queryClient.setQueryData(
          assetsKey(context.planId),
          context.previousAssets,
        );
      }
    },
    onSettled: (_data, _err, variables) => {
      void queryClient.invalidateQueries({
        queryKey: assetsKey(variables.planId),
      });
    },
  });
}

// --- Liabilities ---

export function useCreateLiability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (liability: Liability) => liabilityRepo.create(liability),
    onMutate: async (newLiability) => {
      const key = liabilitiesKey(newLiability.planId);
      await queryClient.cancelQueries({ queryKey: key });

      const previousLiabilities = queryClient.getQueryData<Liability[]>(key);

      // Optimistically add the new liability
      queryClient.setQueryData<Liability[]>(key, (old = []) => [
        ...old,
        newLiability,
      ]);

      return { previousLiabilities, planId: newLiability.planId };
    },
    onError: (_err, _newLiability, context) => {
      if (context?.previousLiabilities !== undefined) {
        queryClient.setQueryData(
          liabilitiesKey(context.planId),
          context.previousLiabilities,
        );
      }
    },
    onSettled: (_data, _err, variables) => {
      void queryClient.invalidateQueries({
        queryKey: liabilitiesKey(variables.planId),
      });
    },
  });
}

export function useUpdateLiability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (liability: Liability) => liabilityRepo.update(liability),
    onMutate: async (updatedLiability) => {
      const key = liabilitiesKey(updatedLiability.planId);
      await queryClient.cancelQueries({ queryKey: key });

      const previousLiabilities = queryClient.getQueryData<Liability[]>(key);

      // Optimistically update the liability
      queryClient.setQueryData<Liability[]>(key, (old = []) =>
        old.map((l) => (l.id === updatedLiability.id ? updatedLiability : l)),
      );

      return { previousLiabilities, planId: updatedLiability.planId };
    },
    onError: (_err, _liability, context) => {
      if (context?.previousLiabilities !== undefined) {
        queryClient.setQueryData(
          liabilitiesKey(context.planId),
          context.previousLiabilities,
        );
      }
    },
    onSettled: (_data, _err, variables) => {
      void queryClient.invalidateQueries({
        queryKey: liabilitiesKey(variables.planId),
      });
    },
  });
}

export function useDeleteLiability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; planId: string }) =>
      liabilityRepo.delete(id),
    onMutate: async ({ id, planId }) => {
      const key = liabilitiesKey(planId);
      await queryClient.cancelQueries({ queryKey: key });

      const previousLiabilities = queryClient.getQueryData<Liability[]>(key);

      // Optimistically remove the liability
      queryClient.setQueryData<Liability[]>(key, (old = []) =>
        old.filter((l) => l.id !== id),
      );

      return { previousLiabilities, planId };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousLiabilities !== undefined) {
        queryClient.setQueryData(
          liabilitiesKey(context.planId),
          context.previousLiabilities,
        );
      }
    },
    onSettled: (_data, _err, variables) => {
      void queryClient.invalidateQueries({
        queryKey: liabilitiesKey(variables.planId),
      });
    },
  });
}

// --- Recurring Templates ---

export function useCreateRecurringTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (template: RecurringTemplate) =>
      recurringTemplateRepo.create(template),
    onMutate: async (newTemplate) => {
      const key = recurringTemplatesKey(newTemplate.planId);
      await queryClient.cancelQueries({ queryKey: key });

      const previousTemplates =
        queryClient.getQueryData<RecurringTemplate[]>(key);

      // Optimistically add the new template
      queryClient.setQueryData<RecurringTemplate[]>(key, (old = []) => [
        ...old,
        newTemplate,
      ]);

      return { previousTemplates, planId: newTemplate.planId };
    },
    onError: (_err, _newTemplate, context) => {
      if (context?.previousTemplates !== undefined) {
        queryClient.setQueryData(
          recurringTemplatesKey(context.planId),
          context.previousTemplates,
        );
      }
    },
    onSettled: (_data, _err, variables) => {
      void queryClient.invalidateQueries({
        queryKey: recurringTemplatesKey(variables.planId),
      });
    },
  });
}

export function useUpdateRecurringTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (template: RecurringTemplate) =>
      recurringTemplateRepo.update(template),
    onMutate: async (updatedTemplate) => {
      const key = recurringTemplatesKey(updatedTemplate.planId);
      await queryClient.cancelQueries({ queryKey: key });

      const previousTemplates =
        queryClient.getQueryData<RecurringTemplate[]>(key);

      // Optimistically update the template
      queryClient.setQueryData<RecurringTemplate[]>(key, (old = []) =>
        old.map((t) => (t.id === updatedTemplate.id ? updatedTemplate : t)),
      );

      return { previousTemplates, planId: updatedTemplate.planId };
    },
    onError: (_err, _template, context) => {
      if (context?.previousTemplates !== undefined) {
        queryClient.setQueryData(
          recurringTemplatesKey(context.planId),
          context.previousTemplates,
        );
      }
    },
    onSettled: (_data, _err, variables) => {
      void queryClient.invalidateQueries({
        queryKey: recurringTemplatesKey(variables.planId),
      });
    },
  });
}

export function useDeleteRecurringTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; planId: string }) =>
      recurringTemplateRepo.delete(id),
    onMutate: async ({ id, planId }) => {
      const key = recurringTemplatesKey(planId);
      await queryClient.cancelQueries({ queryKey: key });

      const previousTemplates =
        queryClient.getQueryData<RecurringTemplate[]>(key);

      // Optimistically remove the template
      queryClient.setQueryData<RecurringTemplate[]>(key, (old = []) =>
        old.filter((t) => t.id !== id),
      );

      return { previousTemplates, planId };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTemplates !== undefined) {
        queryClient.setQueryData(
          recurringTemplatesKey(context.planId),
          context.previousTemplates,
        );
      }
    },
    onSettled: (_data, _err, variables) => {
      void queryClient.invalidateQueries({
        queryKey: recurringTemplatesKey(variables.planId),
      });
    },
  });
}

export function useToggleRecurringTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; planId: string }) =>
      recurringTemplateRepo.toggleActive(id),
    onMutate: async ({ id, planId }) => {
      const key = recurringTemplatesKey(planId);
      await queryClient.cancelQueries({ queryKey: key });

      const previousTemplates =
        queryClient.getQueryData<RecurringTemplate[]>(key);

      // Optimistically toggle the template
      queryClient.setQueryData<RecurringTemplate[]>(key, (old = []) =>
        old.map((t) => (t.id === id ? { ...t, isActive: !t.isActive } : t)),
      );

      return { previousTemplates, planId };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTemplates !== undefined) {
        queryClient.setQueryData(
          recurringTemplatesKey(context.planId),
          context.previousTemplates,
        );
      }
    },
    onSettled: (_data, _err, variables) => {
      void queryClient.invalidateQueries({
        queryKey: recurringTemplatesKey(variables.planId),
      });
    },
  });
}
