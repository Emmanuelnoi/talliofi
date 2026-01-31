import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TaxSimpleInputSchema } from '@/domain/plan/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useOnboardingDataStore } from '../stores/onboarding-data-store';
import type { TaxFormData } from '../types';

interface TaxStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function TaxStep({ onNext, onBack }: TaxStepProps) {
  const storedTax = useOnboardingDataStore((s) => s.tax);
  const setTax = useOnboardingDataStore((s) => s.setTax);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TaxFormData>({
    resolver: zodResolver(TaxSimpleInputSchema),
    defaultValues: storedTax,
  });

  const onSubmit = (data: TaxFormData) => {
    setTax(data);
    onNext();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estimate your taxes</CardTitle>
        <CardDescription>
          Enter your estimated effective tax rate. This includes federal, state,
          and local taxes combined. You can fine-tune this later.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="effectiveRate">Effective tax rate (%)</Label>
            <Input
              id="effectiveRate"
              type="number"
              step="0.1"
              min="0"
              max="100"
              placeholder="25"
              className="money"
              aria-invalid={!!errors.effectiveRate}
              {...register('effectiveRate', { valueAsNumber: true })}
            />
            {errors.effectiveRate && (
              <p className="text-destructive text-sm">
                {errors.effectiveRate.message}
              </p>
            )}
            <p className="text-muted-foreground text-xs">
              Typical ranges: 15-30% for most individuals. Check your last tax
              return for a more accurate number.
            </p>
          </div>

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button type="submit">Continue</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
