import { useCallback } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import {
  ExpensesFormSchema,
  FrequencySchema,
  ExpenseCategorySchema,
} from '@/domain/plan/schemas';
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
import { CATEGORY_LABELS, FREQUENCY_LABELS } from '../constants';

type ExpensesFormData = z.infer<typeof ExpensesFormSchema>;

interface ExpensesStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function ExpensesStep({ onNext, onBack }: ExpensesStepProps) {
  const storedExpenses = useOnboardingDataStore((s) => s.expenses);
  const setExpenses = useOnboardingDataStore((s) => s.setExpenses);
  const buckets = useOnboardingDataStore((s) => s.buckets);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ExpensesFormData>({
    resolver: zodResolver(ExpensesFormSchema),
    defaultValues: {
      expenses: storedExpenses,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'expenses',
  });

  const handleAddExpense = useCallback(() => {
    append({
      name: '',
      amountDollars: 0,
      frequency: 'monthly',
      category: 'other',
      bucketId: '',
      isFixed: false,
    });
  }, [append]);

  const onSubmit = (data: ExpensesFormData) => {
    setExpenses(data.expenses);
    onNext();
  };

  const handleSkip = () => {
    setExpenses([]);
    onNext();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add recurring expenses</CardTitle>
        <CardDescription>
          Add your regular expenses. This step is optional -- you can always add
          expenses later.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="bg-muted/50 space-y-3 rounded-lg border p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor={`expenses.${index}.name`}>Name</Label>
                    <Input
                      id={`expenses.${index}.name`}
                      placeholder="e.g., Rent"
                      aria-invalid={!!errors.expenses?.[index]?.name}
                      {...register(`expenses.${index}.name`)}
                    />
                    {errors.expenses?.[index]?.name && (
                      <p className="text-destructive text-sm">
                        {errors.expenses[index].name.message}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-6 shrink-0"
                    onClick={() => remove(index)}
                    aria-label={`Remove expense ${index + 1}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor={`expenses.${index}.amountDollars`}>
                      Amount ($)
                    </Label>
                    <Input
                      id={`expenses.${index}.amountDollars`}
                      type="number"
                      step="0.01"
                      min="0"
                      className="money"
                      {...register(`expenses.${index}.amountDollars`, {
                        valueAsNumber: true,
                      })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`expenses.${index}.frequency`}>
                      Frequency
                    </Label>
                    <Select
                      value={watch(`expenses.${index}.frequency`)}
                      onValueChange={(value) =>
                        setValue(
                          `expenses.${index}.frequency`,
                          value as z.infer<typeof FrequencySchema>,
                          { shouldValidate: true },
                        )
                      }
                    >
                      <SelectTrigger id={`expenses.${index}.frequency`}>
                        <SelectValue />
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
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor={`expenses.${index}.category`}>
                      Category
                    </Label>
                    <Select
                      value={watch(`expenses.${index}.category`)}
                      onValueChange={(value) =>
                        setValue(
                          `expenses.${index}.category`,
                          value as z.infer<typeof ExpenseCategorySchema>,
                          { shouldValidate: true },
                        )
                      }
                    >
                      <SelectTrigger id={`expenses.${index}.category`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CATEGORY_LABELS).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`expenses.${index}.bucketId`}>Bucket</Label>
                    <Select
                      value={watch(`expenses.${index}.bucketId`)}
                      onValueChange={(value) =>
                        setValue(`expenses.${index}.bucketId`, value, {
                          shouldValidate: true,
                        })
                      }
                    >
                      <SelectTrigger id={`expenses.${index}.bucketId`}>
                        <SelectValue placeholder="Select bucket" />
                      </SelectTrigger>
                      <SelectContent>
                        {buckets.map((bucket, bucketIndex) => (
                          <SelectItem key={bucketIndex} value={bucket.name}>
                            <span
                              className="mr-2 inline-block size-2 rounded-full"
                              style={{ backgroundColor: bucket.color }}
                            />
                            {bucket.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleAddExpense}
          >
            <Plus className="size-4" />
            Add expense
          </Button>

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={onBack}>
              Back
            </Button>
            <div className="flex gap-2">
              {fields.length === 0 && (
                <Button type="button" variant="ghost" onClick={handleSkip}>
                  Skip
                </Button>
              )}
              <Button type="submit" disabled={fields.length === 0}>
                Continue
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
