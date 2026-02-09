import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import type { Plan } from '@/domain/plan/types';
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
import { usePlanMutations } from '../hooks/use-plan-mutations';

const duplicatePlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required').max(100),
});

interface DuplicatePlanFormValues {
  name: string;
}

interface DuplicatePlanDialogProps {
  plan: Plan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog for duplicating an existing plan.
 */
export function DuplicatePlanDialog({
  plan,
  open,
  onOpenChange,
}: DuplicatePlanDialogProps) {
  const { duplicatePlan } = usePlanMutations();

  const form = useForm<DuplicatePlanFormValues>({
    resolver: zodResolver(duplicatePlanSchema),
    defaultValues: {
      name: '',
    },
  });

  // Set default name when plan changes
  useEffect(() => {
    if (plan) {
      form.reset({ name: `${plan.name} (Copy)` });
    }
  }, [plan, form]);

  const isSubmitting = duplicatePlan.isPending;

  const handleSubmit = async (values: DuplicatePlanFormValues) => {
    if (!plan) return;

    try {
      await duplicatePlan.mutateAsync({
        planId: plan.id,
        newName: values.name,
      });
      form.reset();
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicate Plan</DialogTitle>
          <DialogDescription>
            Create a copy of <strong>{plan?.name}</strong> with all its data.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="duplicate-plan-name">New Plan Name</Label>
            <Input
              id="duplicate-plan-name"
              {...form.register('name')}
              aria-invalid={!!form.formState.errors.name}
            />
            {form.formState.errors.name && (
              <p className="text-destructive text-sm">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

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
              Duplicate Plan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
