import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { IncomeInputSchema } from '@/domain/plan/schemas';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
    register,
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
        <CardTitle>What is your gross income?</CardTitle>
        <CardDescription>
          Enter your total income before taxes and deductions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="grossIncomeDollars">Gross income ($)</Label>
            <Input
              id="grossIncomeDollars"
              type="number"
              step="0.01"
              min="0"
              placeholder="5000.00"
              className="money"
              aria-invalid={!!errors.grossIncomeDollars}
              {...register('grossIncomeDollars', { valueAsNumber: true })}
            />
            {errors.grossIncomeDollars && (
              <p className="text-destructive text-sm">
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
                <SelectValue placeholder="Select frequency" />
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
              <p className="text-destructive text-sm">
                {errors.incomeFrequency.message}
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit">Continue</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
