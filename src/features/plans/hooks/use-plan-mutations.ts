import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { planRepo } from '@/data/repos/plan-repo';
import { bucketRepo } from '@/data/repos/bucket-repo';
import { dollarsToCents } from '@/domain/money';
import {
  ACTIVE_PLAN_QUERY_KEY,
  ALL_PLANS_QUERY_KEY,
} from '@/hooks/use-active-plan';
import { useUIStore } from '@/stores/ui-store';
import { getTemplateById } from '@/lib/budget-templates';
import type { Plan, BucketAllocation } from '@/domain/plan/types';
import type { CreatePlanInput, UpdatePlanInput } from '../types';

/**
 * Default bucket allocations for a new empty plan.
 */
const DEFAULT_BUCKETS = [
  { name: 'Needs', color: '#3B82F6', targetPercentage: 50 },
  { name: 'Wants', color: '#10B981', targetPercentage: 30 },
  { name: 'Savings', color: '#F59E0B', targetPercentage: 20 },
] as const;

/**
 * Hook for plan CRUD mutations.
 */
export function usePlanMutations() {
  const queryClient = useQueryClient();
  const incrementVersion = useUIStore((s) => s.incrementPlanListVersion);

  const invalidateQueries = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ACTIVE_PLAN_QUERY_KEY });
    await queryClient.invalidateQueries({ queryKey: ALL_PLANS_QUERY_KEY });
    incrementVersion();
  }, [queryClient, incrementVersion]);

  const createPlan = useMutation({
    mutationFn: async (input: CreatePlanInput): Promise<Plan> => {
      const now = new Date().toISOString();
      const planId = crypto.randomUUID();

      const plan: Plan = {
        id: planId,
        name: input.name,
        grossIncomeCents: dollarsToCents(input.grossIncomeDollars ?? 0),
        incomeFrequency: input.incomeFrequency ?? 'monthly',
        taxMode: 'simple',
        taxEffectiveRate: input.taxEffectiveRate ?? 25,
        createdAt: now,
        updatedAt: now,
        version: 0,
      };

      const createdPlan = await planRepo.create(plan);

      // Create buckets based on mode
      if (input.mode === 'empty') {
        // Create default buckets if starting fresh
        for (let i = 0; i < DEFAULT_BUCKETS.length; i++) {
          const b = DEFAULT_BUCKETS[i];
          const bucket: BucketAllocation = {
            id: crypto.randomUUID(),
            planId,
            name: b.name,
            color: b.color,
            mode: 'percentage',
            targetPercentage: b.targetPercentage,
            sortOrder: i,
            createdAt: now,
          };
          await bucketRepo.create(bucket);
        }
      } else if (input.mode === 'template' && input.templateId) {
        // Create buckets from the selected template
        const template = getTemplateById(input.templateId);
        if (template) {
          for (let i = 0; i < template.buckets.length; i++) {
            const b = template.buckets[i];
            const bucket: BucketAllocation = {
              id: crypto.randomUUID(),
              planId,
              name: b.name,
              color: b.color,
              mode: 'percentage',
              targetPercentage: b.targetPercentage,
              sortOrder: i,
              createdAt: now,
            };
            await bucketRepo.create(bucket);
          }
        }
      }

      return createdPlan;
    },
    onSuccess: () => {
      toast.success('Plan created successfully');
      void invalidateQueries();
    },
    onError: (error) => {
      toast.error(`Failed to create plan: ${error.message}`);
    },
  });

  const updatePlan = useMutation({
    mutationFn: async (input: UpdatePlanInput): Promise<Plan> => {
      const existing = await planRepo.getById(input.id);
      if (!existing) {
        throw new Error(`Plan not found: ${input.id}`);
      }

      const updated: Plan = {
        ...existing,
        name: input.name ?? existing.name,
        updatedAt: new Date().toISOString(),
      };

      return planRepo.update(updated);
    },
    onSuccess: () => {
      toast.success('Plan updated successfully');
      void invalidateQueries();
    },
    onError: (error) => {
      toast.error(`Failed to update plan: ${error.message}`);
    },
  });

  const deletePlan = useMutation({
    mutationFn: async (planId: string): Promise<void> => {
      // Check if this is the last plan
      const allPlans = await planRepo.getAll();
      if (allPlans.length <= 1) {
        throw new Error('Cannot delete the last plan');
      }
      await planRepo.delete(planId);
    },
    onSuccess: () => {
      toast.success('Plan deleted successfully');
      void invalidateQueries();
    },
    onError: (error) => {
      toast.error(`Failed to delete plan: ${error.message}`);
    },
  });

  const duplicatePlan = useMutation({
    mutationFn: async ({
      planId,
      newName,
    }: {
      planId: string;
      newName: string;
    }): Promise<Plan> => {
      return planRepo.duplicate(planId, newName);
    },
    onSuccess: () => {
      toast.success('Plan duplicated successfully');
      void invalidateQueries();
    },
    onError: (error) => {
      toast.error(`Failed to duplicate plan: ${error.message}`);
    },
  });

  return {
    createPlan,
    updatePlan,
    deletePlan,
    duplicatePlan,
  };
}
