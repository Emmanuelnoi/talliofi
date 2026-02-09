import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useAllPlans, useSwitchPlan } from '@/hooks/use-active-plan';
import { BUDGET_TEMPLATES } from '@/lib/budget-templates';
import type { BudgetTemplate } from '@/lib/budget-templates';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TemplateSelector } from '@/components/budget-templates';
import { usePlanMutations } from '../hooks/use-plan-mutations';
import type { CreatePlanFormValues } from '../types';

const createPlanSchema = z
  .object({
    name: z.string().min(1, 'Plan name is required').max(100),
    mode: z.enum(['empty', 'copy', 'template']),
    sourcePlanId: z.string(),
    templateId: z.string(),
  })
  .refine(
    (data) => {
      if (data.mode === 'copy' && !data.sourcePlanId) {
        return false;
      }
      return true;
    },
    {
      message: 'Please select a plan to copy from',
      path: ['sourcePlanId'],
    },
  )
  .refine(
    (data) => {
      if (data.mode === 'template' && !data.templateId) {
        return false;
      }
      return true;
    },
    {
      message: 'Please select a template',
      path: ['templateId'],
    },
  );

interface CreatePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog for creating a new budget plan.
 * Supports creating an empty plan or duplicating an existing one.
 */
export function CreatePlanDialog({ open, onOpenChange }: CreatePlanDialogProps) {
  const { data: allPlans = [] } = useAllPlans();
  const { createPlan, duplicatePlan } = usePlanMutations();
  const switchPlan = useSwitchPlan();
  const [selectedTemplate, setSelectedTemplate] =
    useState<BudgetTemplate | null>(null);

  const form = useForm<CreatePlanFormValues>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: {
      name: '',
      mode: 'empty',
      sourcePlanId: '',
      templateId: '',
    },
  });

  const mode = form.watch('mode');
  const isSubmitting = createPlan.isPending || duplicatePlan.isPending;

  const handleSelectTemplate = (template: BudgetTemplate | null) => {
    setSelectedTemplate(template);
    form.setValue('templateId', template?.id ?? '');
  };

  const handleSubmit = async (values: CreatePlanFormValues) => {
    try {
      let newPlanId: string;

      if (values.mode === 'copy' && values.sourcePlanId) {
        const newPlan = await duplicatePlan.mutateAsync({
          planId: values.sourcePlanId,
          newName: values.name,
        });
        newPlanId = newPlan.id;
      } else if (values.mode === 'template' && values.templateId) {
        const newPlan = await createPlan.mutateAsync({
          name: values.name,
          mode: 'template',
          templateId: values.templateId,
        });
        newPlanId = newPlan.id;
      } else {
        const newPlan = await createPlan.mutateAsync({
          name: values.name,
          mode: 'empty',
        });
        newPlanId = newPlan.id;
      }

      // Switch to the new plan
      await switchPlan(newPlanId);

      form.reset();
      setSelectedTemplate(null);
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleClose = () => {
    form.reset();
    setSelectedTemplate(null);
    onOpenChange(false);
  };

  // Reset template selection when mode changes
  const handleModeChange = (value: 'empty' | 'copy' | 'template') => {
    form.setValue('mode', value);
    if (value !== 'template') {
      setSelectedTemplate(null);
      form.setValue('templateId', '');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Plan</DialogTitle>
          <DialogDescription>
            Create a new budget plan to track different scenarios or goals.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plan-name">Plan Name</Label>
            <Input
              id="plan-name"
              placeholder="e.g., Main Budget, What-If Scenario"
              {...form.register('name')}
              aria-invalid={!!form.formState.errors.name}
            />
            {form.formState.errors.name && (
              <p className="text-destructive text-sm">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="creation-mode">Start From</Label>
            <Select value={mode} onValueChange={handleModeChange}>
              <SelectTrigger id="creation-mode">
                <SelectValue placeholder="Select how to start" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="empty">
                  Fresh start (default 50/30/20 buckets)
                </SelectItem>
                <SelectItem value="template">Use a budget template</SelectItem>
                <SelectItem value="copy">Copy from existing plan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === 'template' && (
            <div className="space-y-2">
              <Label>Select Template</Label>
              <div className="max-h-64 overflow-y-auto rounded-md border p-2">
                <TemplateSelector
                  selectedTemplateId={selectedTemplate?.id ?? null}
                  onSelectTemplate={handleSelectTemplate}
                  showScratchOption={false}
                />
              </div>
              {form.formState.errors.templateId && (
                <p className="text-destructive text-sm">
                  {form.formState.errors.templateId.message}
                </p>
              )}
            </div>
          )}

          {mode === 'copy' && (
            <div className="space-y-2">
              <Label htmlFor="source-plan">Copy From</Label>
              <Select
                value={form.watch('sourcePlanId')}
                onValueChange={(value) => form.setValue('sourcePlanId', value)}
              >
                <SelectTrigger id="source-plan">
                  <SelectValue placeholder="Select a plan to copy" />
                </SelectTrigger>
                <SelectContent>
                  {allPlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.sourcePlanId && (
                <p className="text-destructive text-sm">
                  {form.formState.errors.sourcePlanId.message}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Create Plan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
