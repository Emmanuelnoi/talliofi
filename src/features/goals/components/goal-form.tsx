import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import type { z } from 'zod';
import { GoalFormSchema } from '@/domain/plan/schemas';
import type { Goal, GoalType } from '@/domain/plan';
import { centsToDollars } from '@/domain/money';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoneyInput } from '@/components/forms/money-input';
import { GOAL_TYPE_LABELS, GOAL_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';

export type GoalFormData = z.infer<typeof GoalFormSchema>;

interface GoalFormProps {
  /** Existing goal to edit, or null for creating a new goal */
  goal: Goal | null;
  /** Callback when the form is submitted */
  onSave: (data: GoalFormData) => Promise<void>;
  /** Callback when the form is cancelled */
  onCancel: () => void;
}

/**
 * Form component for creating or editing a financial goal.
 * Handles both savings goals and debt payoff goals.
 */
export function GoalForm({ goal, onSave, onCancel }: GoalFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<GoalFormData>({
    resolver: zodResolver(GoalFormSchema),
    defaultValues: goal
      ? {
          name: goal.name,
          type: goal.type,
          targetAmountDollars: centsToDollars(goal.targetAmountCents),
          currentAmountDollars: centsToDollars(goal.currentAmountCents),
          targetDate: goal.targetDate ?? '',
          color: goal.color,
          notes: goal.notes ?? '',
        }
      : {
          name: '',
          type: 'savings' as GoalType,
          targetAmountDollars: 0,
          currentAmountDollars: 0,
          targetDate: '',
          color: GOAL_COLORS[0],
          notes: '',
        },
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = form;

  const selectedColor = watch('color');

  const onSubmit = async (data: GoalFormData) => {
    setIsSubmitting(true);
    try {
      await onSave(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5 px-4 pt-4"
    >
      {/* Goal name */}
      <div className="space-y-2">
        <Label htmlFor="goal-name">Name</Label>
        <Input
          id="goal-name"
          placeholder="e.g., Emergency Fund"
          aria-invalid={!!errors.name}
          {...register('name')}
        />
        {errors.name && (
          <p className="text-destructive text-sm">{errors.name.message}</p>
        )}
      </div>

      {/* Goal type */}
      <div className="space-y-2">
        <Label htmlFor="goal-type">Type</Label>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="goal-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(GOAL_TYPE_LABELS) as [GoalType, string][]).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Target and current amounts */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="goal-target">Target amount</Label>
          <Controller
            control={control}
            name="targetAmountDollars"
            render={({ field, fieldState }) => (
              <>
                <MoneyInput
                  id="goal-target"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  min={0}
                />
                {fieldState.error && (
                  <p className="text-destructive text-sm">
                    {fieldState.error.message}
                  </p>
                )}
              </>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="goal-current">Current amount</Label>
          <Controller
            control={control}
            name="currentAmountDollars"
            render={({ field, fieldState }) => (
              <>
                <MoneyInput
                  id="goal-current"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  min={0}
                />
                {fieldState.error && (
                  <p className="text-destructive text-sm">
                    {fieldState.error.message}
                  </p>
                )}
              </>
            )}
          />
        </div>
      </div>

      {/* Target date (optional) */}
      <div className="space-y-2">
        <Label htmlFor="goal-date">Target date (optional)</Label>
        <Input
          id="goal-date"
          type="date"
          {...register('targetDate')}
          min={new Date().toISOString().split('T')[0]}
        />
        {errors.targetDate && (
          <p className="text-destructive text-sm">
            {errors.targetDate.message}
          </p>
        )}
      </div>

      {/* Color picker */}
      <div className="space-y-2">
        <Label>Color</Label>
        <Controller
          control={control}
          name="color"
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {GOAL_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => field.onChange(color)}
                  className={cn(
                    'size-8 rounded-full border-2 transition-transform transition-colors',
                    selectedColor === color
                      ? 'border-foreground scale-110'
                      : 'border-transparent hover:scale-105',
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                  aria-pressed={selectedColor === color}
                />
              ))}
            </div>
          )}
        />
      </div>

      {/* Notes (optional) */}
      <div className="space-y-2">
        <Label htmlFor="goal-notes">Notes (optional)</Label>
        <Input
          id="goal-notes"
          placeholder="Any additional notes…"
          {...register('notes')}
        />
        {errors.notes && (
          <p className="text-destructive text-sm">{errors.notes.message}</p>
        )}
      </div>

      {/* Form actions */}
      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          {goal ? 'Save changes' : 'Create goal'}
        </Button>
      </div>
    </form>
  );
}
