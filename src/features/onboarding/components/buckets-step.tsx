import { useCallback } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { BucketsFormSchema } from '@/domain/plan/schemas';
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
import { MoneyInput } from '@/components/forms/money-input';
import { PercentInput } from '@/components/forms/percent-input';
import { useOnboardingDataStore } from '../stores/onboarding-data-store';

type BucketsFormData = z.input<typeof BucketsFormSchema>;

const BUCKET_COLORS = [
  '#4A90D9',
  '#50C878',
  '#FFB347',
  '#FF6B6B',
  '#9B59B6',
  '#1ABC9C',
  '#F39C12',
  '#E74C3C',
] as const;

interface BucketsStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function BucketsStep({ onNext, onBack }: BucketsStepProps) {
  const storedBuckets = useOnboardingDataStore((s) => s.buckets);
  const setBuckets = useOnboardingDataStore((s) => s.setBuckets);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<BucketsFormData>({
    resolver: zodResolver(BucketsFormSchema),
    defaultValues: {
      buckets: storedBuckets,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'buckets',
  });

  const handleAddBucket = useCallback(() => {
    append({
      name: '',
      color: BUCKET_COLORS[fields.length % BUCKET_COLORS.length],
      mode: 'percentage',
      targetPercentage: 0,
      rolloverEnabled: false,
    });
  }, [append, fields.length]);

  const watchedBuckets = useWatch({ control, name: 'buckets' }) ?? [];
  const totalPercentage = watchedBuckets.reduce(
    (sum, b) =>
      b.mode === 'percentage' ? sum + (b.targetPercentage ?? 0) : sum,
    0,
  );

  const onSubmit = (data: BucketsFormData) => {
    setBuckets(data.buckets);
    onNext();
  };

  return (
    <Card>
      <CardHeader>
        <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.2em]">
          Buckets
        </p>
        <CardTitle>Set up your buckets</CardTitle>
        <CardDescription>
          Buckets are spending categories for your budget. Start with a simple
          50/30/20 split or customize your own.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-4">
            {fields.map((field, index) => {
              const bucketValues = watchedBuckets[index];
              const mode = bucketValues?.mode ?? 'percentage';
              const colorValue =
                bucketValues?.color ??
                field.color ??
                BUCKET_COLORS[index % BUCKET_COLORS.length];
              return (
                <div
                  key={field.id}
                  className="bg-muted/40 space-y-4 rounded-lg border border-border/60 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor={`buckets.${index}.name`}>
                        Bucket name
                      </Label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          tabIndex={0}
                          className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-border/60 bg-background"
                          value={colorValue}
                          onChange={(e) =>
                            setValue(`buckets.${index}.color`, e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.currentTarget.click();
                            }
                          }}
                          aria-label={`Color for bucket ${index + 1}`}
                        />
                        <Input
                          id={`buckets.${index}.name`}
                          placeholder="e.g., Essentials…"
                          aria-invalid={!!errors.buckets?.[index]?.name}
                          {...register(`buckets.${index}.name`)}
                        />
                      </div>
                      {errors.buckets?.[index]?.name && (
                        <p className="text-destructive text-xs">
                          {errors.buckets[index].name.message}
                        </p>
                      )}
                    </div>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mt-6 shrink-0"
                        onClick={() => remove(index)}
                        aria-label={`Remove bucket ${index + 1}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`buckets.${index}.mode`}>Type</Label>
                      <Select
                        value={mode}
                        onValueChange={(value) =>
                          setValue(
                            `buckets.${index}.mode`,
                            value as 'percentage' | 'fixed',
                          )
                        }
                      >
                        <SelectTrigger id={`buckets.${index}.mode`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="fixed">Fixed amount</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      {mode === 'percentage' ? (
                        <>
                          <Label htmlFor={`buckets.${index}.targetPercentage`}>
                            Target (%)
                          </Label>
                          <Controller
                            control={control}
                            name={`buckets.${index}.targetPercentage`}
                            render={({ field }) => (
                              <PercentInput
                                id={`buckets.${index}.targetPercentage`}
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                min={0}
                                max={100}
                              />
                            )}
                          />
                        </>
                      ) : (
                        <>
                          <Label
                            htmlFor={`buckets.${index}.targetAmountDollars`}
                          >
                            Target ($)
                          </Label>
                          <Controller
                            control={control}
                            name={`buckets.${index}.targetAmountDollars`}
                            render={({ field }) => (
                              <MoneyInput
                                id={`buckets.${index}.targetAmountDollars`}
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                min={0}
                              />
                            )}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPercentage > 0 && totalPercentage !== 100 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Percentage buckets sum to {totalPercentage}% (100% recommended)
            </p>
          )}

          {errors.buckets?.root && (
            <p className="text-destructive text-xs">
              {errors.buckets.root.message}
            </p>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleAddBucket}
          >
            <Plus className="size-4" />
            Add Bucket
          </Button>

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button type="submit">Continue to Expenses</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
