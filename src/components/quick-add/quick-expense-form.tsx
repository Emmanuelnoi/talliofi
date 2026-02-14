import { useState, useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import { z } from 'zod';
import { CalendarIcon, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ExpenseCategorySchema, FrequencySchema } from '@/domain/plan/schemas';
import { dollarsToCents } from '@/domain/money';
import type { ExpenseItem, BucketAllocation } from '@/domain/plan';
import { MoneyInput } from '@/components/forms/money-input';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useActivePlan } from '@/hooks/use-active-plan';
import { useBuckets } from '@/hooks/use-plan-data';
import { useCreateExpense } from '@/hooks/use-plan-mutations';
import { FREQUENCY_LABELS, CATEGORY_LABELS } from '@/lib/constants';
import { getErrorMessage } from '@/lib/error-message';

/**
 * Quick expense form schema with essential fields required,
 * and optional expanded fields.
 */
const QuickExpenseFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  amountDollars: z.number().positive('Amount must be greater than 0'),
  category: ExpenseCategorySchema,
  bucketId: z.string().uuid('Select a bucket'),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  // Expanded options (with defaults)
  frequency: FrequencySchema,
  notes: z.string().max(500).optional(),
  isFixed: z.boolean(),
});

type QuickExpenseFormData = z.infer<typeof QuickExpenseFormSchema>;

interface QuickExpenseFormProps {
  /** Called after successful submission */
  onSuccess?: () => void;
  /** Called when user cancels */
  onCancel?: () => void;
}

/** Helper to get today's date in ISO format (YYYY-MM-DD) */
function getTodayISODate(): string {
  return new Date().toISOString().split('T')[0];
}

/** Helper to format transaction date for display */
function formatTransactionDate(date: string | undefined): string {
  if (!date) return 'Select date';
  try {
    return format(parseISO(date), 'MMM d, yyyy');
  } catch {
    return 'Invalid date';
  }
}

/**
 * Simplified expense form for quick entry.
 * Shows essential fields upfront with expandable "More options" section.
 */
export function QuickExpenseForm({
  onSuccess,
  onCancel,
}: QuickExpenseFormProps) {
  const { data: plan } = useActivePlan();
  const { data: buckets = [] } = useBuckets(plan?.id);
  const createExpense = useCreateExpense();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<QuickExpenseFormData>({
    resolver: zodResolver(QuickExpenseFormSchema),
    defaultValues: {
      name: '',
      amountDollars: 0,
      category: 'other',
      bucketId: buckets[0]?.id ?? '',
      transactionDate: getTodayISODate(),
      frequency: 'monthly',
      notes: '',
      isFixed: false,
    },
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = form;

  // Update bucket default when buckets load
  useEffect(() => {
    if (buckets.length > 0 && !form.getValues('bucketId')) {
      setValue('bucketId', buckets[0].id);
    }
  }, [buckets, setValue, form]);

  // Focus name input on mount
  useEffect(() => {
    // Small delay to ensure sheet animation completes
    const timer = setTimeout(() => {
      nameInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const onSubmit = async (data: QuickExpenseFormData) => {
    if (!plan) {
      toast.error('No active plan found');
      return;
    }

    setIsSubmitting(true);
    const now = new Date().toISOString();

    try {
      const expense: ExpenseItem = {
        id: crypto.randomUUID(),
        planId: plan.id,
        name: data.name,
        amountCents: dollarsToCents(data.amountDollars),
        frequency: data.frequency,
        category: data.category,
        bucketId: data.bucketId,
        isFixed: data.isFixed,
        notes: data.notes || undefined,
        transactionDate: data.transactionDate,
        createdAt: now,
        updatedAt: now,
      };

      await createExpense.mutateAsync(expense);
      toast.success('Expense added');
      onSuccess?.();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to add expense.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!plan) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground text-sm">
          Complete onboarding to add expenses.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4 px-4 pt-2"
    >
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="quick-expense-name">Name</Label>
        <Input
          id="quick-expense-name"
          placeholder="e.g., Coffee, Groceries"
          aria-invalid={!!errors.name}
          aria-required
          aria-describedby={
            errors.name ? 'quick-expense-name-error' : undefined
          }
          {...register('name')}
          ref={(e) => {
            // Combine register's ref with our nameInputRef for focus management
            nameInputRef.current = e;
            const { ref } = register('name');
            ref(e);
          }}
        />
        {errors.name && (
          <p
            id="quick-expense-name-error"
            role="alert"
            className="text-destructive text-sm"
          >
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Amount + Category row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="quick-expense-amount">Amount</Label>
          <Controller
            control={control}
            name="amountDollars"
            render={({ field, fieldState }) => (
              <>
                <MoneyInput
                  id="quick-expense-amount"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  min={0}
                  aria-invalid={!!fieldState.error}
                  aria-required
                  errorId={
                    fieldState.error ? 'quick-expense-amount-error' : undefined
                  }
                />
                {fieldState.error && (
                  <p
                    id="quick-expense-amount-error"
                    role="alert"
                    className="text-destructive text-sm"
                  >
                    {fieldState.error.message}
                  </p>
                )}
              </>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="quick-expense-category">Category</Label>
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="quick-expense-category">
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
      </div>

      {/* Bucket */}
      <div className="space-y-2">
        <Label htmlFor="quick-expense-bucket">Bucket</Label>
        <Controller
          control={control}
          name="bucketId"
          render={({ field, fieldState }) => (
            <>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id="quick-expense-bucket"
                  aria-invalid={!!fieldState.error}
                  aria-required
                  aria-describedby={
                    fieldState.error ? 'quick-expense-bucket-error' : undefined
                  }
                >
                  <SelectValue placeholder="Select bucket" />
                </SelectTrigger>
                <SelectContent>
                  {buckets.map((b: BucketAllocation) => (
                    <SelectItem key={b.id} value={b.id}>
                      <span
                        className="mr-1.5 inline-block size-2 rounded-full"
                        style={{ backgroundColor: b.color }}
                        aria-hidden="true"
                      />
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.error && (
                <p
                  id="quick-expense-bucket-error"
                  role="alert"
                  className="text-destructive text-sm"
                >
                  {fieldState.error.message}
                </p>
              )}
            </>
          )}
        />
      </div>

      {/* Transaction Date */}
      <div className="space-y-2">
        <Label htmlFor="quick-expense-date">Date</Label>
        <Controller
          control={control}
          name="transactionDate"
          render={({ field }) => (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="quick-expense-date"
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 size-4" />
                  {formatTransactionDate(field.value)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value ? parseISO(field.value) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      field.onChange(format(date, 'yyyy-MM-dd'));
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}
        />
      </div>

      {/* More Options Collapsible */}
      <Collapsible open={moreOptionsOpen} onOpenChange={setMoreOptionsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground -ml-2 h-8 gap-1"
          >
            {moreOptionsOpen ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
            More options
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          {/* Frequency */}
          <div className="space-y-2">
            <Label htmlFor="quick-expense-frequency">Frequency</Label>
            <Controller
              control={control}
              name="frequency"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="quick-expense-frequency">
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

          {/* Fixed expense toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="quick-expense-fixed">Fixed expense</Label>
            <Controller
              control={control}
              name="isFixed"
              render={({ field }) => (
                <Switch
                  id="quick-expense-fixed"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="quick-expense-notes">Notes (optional)</Label>
            <Textarea
              id="quick-expense-notes"
              placeholder="Any additional notes…"
              rows={2}
              {...register('notes')}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

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
          {isSubmitting && (
            <Loader2 className="size-4 motion-safe:animate-spin" />
          )}
          Add Expense
        </Button>
      </div>
    </form>
  );
}

QuickExpenseForm.displayName = 'QuickExpenseForm';
