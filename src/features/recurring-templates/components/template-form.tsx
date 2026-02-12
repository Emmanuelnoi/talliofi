import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { RecurringTemplateFormSchema } from '@/domain/plan/schemas';
import {
  centsToDollars,
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
} from '@/domain/money';
import type { RecurringTemplate, BucketAllocation } from '@/domain/plan';
import { MoneyInput } from '@/components/forms/money-input';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FREQUENCY_LABELS, CATEGORY_LABELS } from '@/lib/constants';
import { useCurrencyStore } from '@/stores/currency-store';

export type TemplateFormData = z.infer<typeof RecurringTemplateFormSchema>;

interface TemplateFormProps {
  /** Existing template for editing, or null for creating new */
  template: RecurringTemplate | null;
  /** Available buckets to assign templates to */
  buckets: BucketAllocation[];
  /** Called when form is submitted with valid data */
  onSave: (data: TemplateFormData) => Promise<void>;
  /** Called when cancel is clicked */
  onCancel: () => void;
}

/**
 * Form component for creating or editing recurring templates.
 *
 * Features:
 * - Name, amount, frequency, category selection
 * - Bucket assignment
 * - Day of month selection for generation timing
 * - Active toggle
 * - Fixed expense toggle
 * - Optional notes
 */
export function TemplateForm({
  template,
  buckets,
  onSave,
  onCancel,
}: TemplateFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const baseCurrency = useCurrencyStore((s) => s.currencyCode);
  const defaultCurrency = template?.currencyCode ?? baseCurrency;

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(RecurringTemplateFormSchema),
    defaultValues: template
      ? {
          name: template.name,
          amountDollars: centsToDollars(template.amountCents),
          frequency: template.frequency,
          category: template.category,
          bucketId: template.bucketId,
          currencyCode: template.currencyCode ?? defaultCurrency,
          dayOfMonth: template.dayOfMonth,
          isActive: template.isActive,
          isFixed: template.isFixed,
          notes: template.notes ?? '',
        }
      : {
          name: '',
          amountDollars: 0,
          frequency: 'monthly',
          category: 'other',
          bucketId: buckets[0]?.id ?? '',
          currencyCode: defaultCurrency,
          dayOfMonth: undefined,
          isActive: true,
          isFixed: true,
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
  const selectedCurrency = watch('currencyCode') ?? defaultCurrency;

  const onSubmit = async (data: TemplateFormData) => {
    setIsSubmitting(true);
    try {
      await onSave(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate day of month options (1-31)
  const dayOptions = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5 px-4 pt-4"
    >
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="template-name">Name</Label>
        <Input
          id="template-name"
          placeholder="e.g., Netflix Subscription"
          aria-invalid={!!errors.name}
          {...register('name')}
        />
        {errors.name && (
          <p className="text-destructive text-sm">{errors.name.message}</p>
        )}
      </div>

      {/* Amount and Frequency */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="template-amount">Amount</Label>
          <Controller
            control={control}
            name="amountDollars"
            render={({ field, fieldState }) => (
              <>
                <MoneyInput
                  id="template-amount"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  min={0}
                  currencyCode={selectedCurrency as CurrencyCode}
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
          <Label htmlFor="template-currency">Currency</Label>
          <Controller
            control={control}
            name="currencyCode"
            render={({ field }) => (
              <Select
                value={field.value ?? defaultCurrency}
                onValueChange={(value) => field.onChange(value as CurrencyCode)}
              >
                <SelectTrigger id="template-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="template-frequency">Frequency</Label>
          <Controller
            control={control}
            name="frequency"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="template-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      {/* Category and Bucket */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="template-category">Category</Label>
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="template-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="template-bucket">Bucket</Label>
          <Controller
            control={control}
            name="bucketId"
            render={({ field, fieldState }) => (
              <>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="template-bucket">
                    <SelectValue placeholder="Select bucket" />
                  </SelectTrigger>
                  <SelectContent>
                    {buckets.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        <span
                          className="mr-1.5 inline-block size-2 rounded-full"
                          style={{ backgroundColor: b.color }}
                        />
                        {b.name}
                      </SelectItem>
                    ))}
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
      </div>

      {/* Day of Month */}
      <div className="space-y-2">
        <Label htmlFor="template-day">Generation day of month (optional)</Label>
        <Controller
          control={control}
          name="dayOfMonth"
          render={({ field }) => (
            <Select
              value={field.value?.toString() ?? ''}
              onValueChange={(val) =>
                field.onChange(val ? parseInt(val, 10) : undefined)
              }
            >
              <SelectTrigger id="template-day">
                <SelectValue placeholder="Same as creation date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Same as creation date</SelectItem>
                {dayOptions.map((day) => (
                  <SelectItem key={day} value={day.toString()}>
                    {day}
                    {day === 1
                      ? 'st'
                      : day === 2
                        ? 'nd'
                        : day === 3
                          ? 'rd'
                          : 'th'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <p className="text-muted-foreground text-xs">
          The day each month when an expense will be automatically generated. If
          the day doesn&apos;t exist in a month (e.g., 31st in February), the
          last day of that month will be used.
        </p>
      </div>

      {/* Toggles */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="template-active">Active</Label>
            <p className="text-muted-foreground text-xs">
              When active, expenses will be auto-generated on schedule
            </p>
          </div>
          <Controller
            control={control}
            name="isActive"
            render={({ field }) => (
              <Switch
                id="template-active"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="template-fixed">Fixed expense</Label>
            <p className="text-muted-foreground text-xs">
              Generated expenses will be marked as fixed
            </p>
          </div>
          <Controller
            control={control}
            name="isFixed"
            render={({ field }) => (
              <Switch
                id="template-fixed"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="template-notes">Notes (optional)</Label>
        <Input
          id="template-notes"
          placeholder="Any additional notes…"
          {...register('notes')}
        />
      </div>

      {/* Actions */}
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
          {template ? 'Save changes' : 'Create template'}
        </Button>
      </div>
    </form>
  );
}
