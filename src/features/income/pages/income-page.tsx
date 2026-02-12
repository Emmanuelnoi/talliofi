import { useEffect } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { z } from 'zod';
import { IncomeInputSchema } from '@/domain/plan/schemas';
import { centsToDollars, dollarsToCents } from '@/domain/money';
import type { Plan } from '@/domain/plan';
import { PageHeader } from '@/components/layout/page-header';
import { SaveIndicator } from '@/components/feedback/save-indicator';
import { MoneyInput } from '@/components/forms/money-input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useActivePlan } from '@/hooks/use-active-plan';
import { useUpdatePlan } from '@/hooks/use-plan-mutations';
import { useAutoSave } from '@/hooks/use-auto-save';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { UnsavedChangesDialog } from '@/components/feedback/unsaved-changes-dialog';
import { FREQUENCY_LABELS } from '@/lib/constants';

type IncomeFormData = z.infer<typeof IncomeInputSchema>;

export default function IncomePage() {
  const { data: plan, isLoading } = useActivePlan();
  const updatePlan = useUpdatePlan();

  const form = useForm<IncomeFormData>({
    resolver: zodResolver(IncomeInputSchema),
    defaultValues: {
      grossIncomeDollars: 0,
      incomeFrequency: 'monthly',
    },
  });

  const { control, reset } = form;

  // Populate form when plan loads
  useEffect(() => {
    if (plan) {
      reset({
        grossIncomeDollars: centsToDollars(plan.grossIncomeCents),
        incomeFrequency: plan.incomeFrequency,
      });
    }
  }, [plan, reset]);

  const watchedData = useWatch({ control });

  const { status } = useAutoSave({
    data: watchedData,
    enabled: !!plan && form.formState.isValid,
    debounceMs: 800,
    onSave: async (data) => {
      if (!plan) return;
      const updated: Plan = {
        ...plan,
        grossIncomeCents: dollarsToCents(data.grossIncomeDollars ?? 0),
        incomeFrequency: data.incomeFrequency ?? plan.incomeFrequency,
      };
      try {
        await updatePlan.mutateAsync(updated);
      } catch {
        toast.error('Failed to save income changes');
      }
    },
  });

  const { blocker, confirmNavigation, cancelNavigation } = useUnsavedChanges({
    isDirty: status === 'saving',
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Income"
          description="Complete onboarding to set up your income."
          eyebrow="Earnings"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Income"
        description="Manage your gross income and pay frequency."
        eyebrow="Earnings"
        action={<SaveIndicator status={status === 'error' ? 'idle' : status} />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Gross income</CardTitle>
          <CardDescription>
            Your total income before taxes and deductions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="grossIncomeDollars">Amount</Label>
            <Controller
              control={control}
              name="grossIncomeDollars"
              render={({ field, fieldState }) => (
                <>
                  <MoneyInput
                    id="grossIncomeDollars"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    min={0}
                    placeholder="5,000.00"
                    aria-invalid={!!fieldState.error}
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
            <Label htmlFor="incomeFrequency">Pay frequency</Label>
            <Controller
              control={control}
              name="incomeFrequency"
              render={({ field, fieldState }) => (
                <>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="incomeFrequency">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(FREQUENCY_LABELS).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <p className="text-destructive text-sm">
                      {fieldState.error.message}
                    </p>
                  )}
                </>
              )}
            />
          </div>
        </CardContent>
      </Card>

      <UnsavedChangesDialog
        open={blocker.state === 'blocked'}
        onStay={cancelNavigation}
        onLeave={confirmNavigation}
      />
    </div>
  );
}
