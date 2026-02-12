import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { IncomeInputSchema } from '@/domain/plan/schemas';
import { Button } from '@/components/ui/button';
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
import { MoneyInput } from '@/components/forms/money-input';
import { useOnboardingDataStore } from '../stores/onboarding-data-store';
import type { IncomeFormData } from '../types';

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'semimonthly', label: 'Semi-monthly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
] as const;

interface IncomeStepProps {
  onNext: () => void;
}

export function IncomeStep({ onNext }: IncomeStepProps) {
  const storedIncome = useOnboardingDataStore((s) => s.income);
  const setIncome = useOnboardingDataStore((s) => s.setIncome);

  const {
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<IncomeFormData>({
    resolver: zodResolver(IncomeInputSchema),
    defaultValues: storedIncome,
  });

  const selectedFrequency =
    useWatch({ control, name: 'incomeFrequency' }) ?? 'monthly';

  const onSubmit = (data: IncomeFormData) => {
    setIncome(data);
    onNext();
  };

  return (
    <Card>
      <CardHeader>
        <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.2em]">
          Income
        </p>
        <CardTitle>What is your gross income?</CardTitle>
        <CardDescription>
          Enter your total income before taxes and deductions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="grossIncomeDollars">Gross income ($)</Label>
            <Controller
              control={control}
              name="grossIncomeDollars"
              render={({ field }) => (
                <MoneyInput
                  id="grossIncomeDollars"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  min={0}
                  placeholder="5,000.00…"
                  aria-invalid={!!errors.grossIncomeDollars}
                />
              )}
            />
            {errors.grossIncomeDollars && (
              <p className="text-destructive text-xs">
                {errors.grossIncomeDollars.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="incomeFrequency">Pay frequency</Label>
            <Select
              value={selectedFrequency}
              onValueChange={(value) =>
                setValue(
                  'incomeFrequency',
                  value as IncomeFormData['incomeFrequency'],
                  { shouldValidate: true },
                )
              }
            >
              <SelectTrigger id="incomeFrequency">
                <SelectValue placeholder="Select frequency…" />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.incomeFrequency && (
              <p className="text-destructive text-xs">
                {errors.incomeFrequency.message}
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit">Continue to Taxes</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
