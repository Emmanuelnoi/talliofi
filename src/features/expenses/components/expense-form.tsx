import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import {
  DEFAULT_CURRENCY,
  centsToDollars,
  getCurrencySymbol,
  type CurrencyCode,
} from '@/domain/money';
import type {
  BucketAllocation,
  ExpenseAttachment,
  ExpenseItem,
} from '@/domain/plan';
import { ExpenseFormSchema } from '@/domain/plan/schemas';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useExpenseAttachments } from '@/hooks/use-plan-data';
import { useCurrencyStore } from '@/stores/currency-store';
import type {
  ExpenseAttachmentPayload,
  ExpenseFormData,
  ExpenseSplitForm,
} from '../types';
import { formatTransactionDate, getTodayISODate } from '../utils/date-utils';
import { ExpenseAttachmentsSection } from './expense-attachments-section';
import { ExpenseCoreFields } from './expense-core-fields';

const EMPTY_SPLITS: ExpenseSplitForm[] = [];

interface ExpenseFormProps {
  expense: ExpenseItem | null;
  buckets: BucketAllocation[];
  onSave: (
    data: ExpenseFormData,
    attachments: ExpenseAttachmentPayload,
  ) => Promise<void>;
  onCancel: () => void;
}

export function ExpenseForm({
  expense,
  buckets,
  onSave,
  onCancel,
}: ExpenseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const baseCurrency = useCurrencyStore((s) => s.currencyCode);
  const defaultCurrency =
    expense?.currencyCode ?? baseCurrency ?? DEFAULT_CURRENCY;

  const { data: existingAttachments = [] } = useExpenseAttachments(expense?.id);
  const [newAttachments, setNewAttachments] = useState<File[]>([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<Set<string>>(
    () => new Set(),
  );

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(ExpenseFormSchema),
    defaultValues: expense
      ? {
          name: expense.name,
          amountDollars: centsToDollars(expense.amountCents),
          frequency: expense.frequency,
          category: expense.category,
          bucketId: expense.bucketId,
          currencyCode: expense.currencyCode ?? defaultCurrency,
          isFixed: expense.isFixed,
          notes: expense.notes ?? '',
          transactionDate: expense.transactionDate ?? getTodayISODate(),
          isSplit: expense.isSplit ?? false,
          splits:
            expense.splits?.map((split) => ({
              bucketId: split.bucketId,
              category: split.category,
              amountDollars: centsToDollars(split.amountCents),
              notes: split.notes,
            })) ?? [],
        }
      : {
          name: '',
          amountDollars: 0,
          frequency: 'monthly',
          category: 'other',
          bucketId: buckets[0]?.id ?? '',
          currencyCode: defaultCurrency,
          isFixed: false,
          notes: '',
          transactionDate: getTodayISODate(),
          isSplit: false,
          splits: [],
        },
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'splits',
  });

  const isSplit = watch('isSplit') ?? false;
  const totalAmount = watch('amountDollars');
  const splits: ExpenseSplitForm[] = watch('splits') ?? EMPTY_SPLITS;
  const selectedCurrency = (watch('currencyCode') ??
    defaultCurrency) as CurrencyCode;
  const currencySymbol = getCurrencySymbol(selectedCurrency);

  const splitTotal = useMemo(
    () => splits.reduce((sum, split) => sum + (split.amountDollars || 0), 0),
    [splits],
  );
  const remainingAmount = totalAmount - splitTotal;
  const splitsMatch = Math.abs(remainingAmount) < 0.01;

  useEffect(() => {
    setNewAttachments([]);
    setRemovedAttachmentIds(new Set());
  }, [expense?.id]);

  const visibleExistingAttachments = useMemo(
    () =>
      (existingAttachments as ExpenseAttachment[]).filter(
        (attachment) => !removedAttachmentIds.has(attachment.id),
      ),
    [existingAttachments, removedAttachmentIds],
  );

  const handleAddAttachments = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      if (files.length === 0) return;
      setNewAttachments((prev) => [...prev, ...files]);
      event.target.value = '';
    },
    [],
  );

  const handleRemoveNewAttachment = useCallback((index: number) => {
    setNewAttachments((prev) => prev.filter((_, idx) => idx !== index));
  }, []);

  const handleRemoveExistingAttachment = useCallback((id: string) => {
    setRemovedAttachmentIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const handleViewAttachment = useCallback((blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) {
      URL.revokeObjectURL(url);
      return;
    }
    win.document.title = name;
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }, []);

  const handleToggleSplit = useCallback(
    (enabled: boolean) => {
      setValue('isSplit', enabled);
      if (enabled && fields.length === 0) {
        const halfAmount = totalAmount / 2;
        append({
          bucketId: buckets[0]?.id ?? '',
          category: 'other',
          amountDollars: halfAmount,
          notes: '',
        });
        append({
          bucketId: buckets[0]?.id ?? '',
          category: 'other',
          amountDollars: halfAmount,
          notes: '',
        });
      }
    },
    [append, buckets, fields.length, setValue, totalAmount],
  );

  const handleAddSplit = useCallback(() => {
    append({
      bucketId: buckets[0]?.id ?? '',
      category: 'other',
      amountDollars: Math.max(0, remainingAmount),
      notes: '',
    });
  }, [append, buckets, remainingAmount]);

  const handleAutoBalance = useCallback(() => {
    if (fields.length === 0) return;
    const lastIndex = fields.length - 1;
    const currentLast = splits[lastIndex]?.amountDollars ?? 0;
    setValue(
      `splits.${lastIndex}.amountDollars`,
      currentLast + remainingAmount,
    );
  }, [fields.length, remainingAmount, setValue, splits]);

  const onSubmit = async (data: ExpenseFormData) => {
    setIsSubmitting(true);
    try {
      await onSave(data, {
        newFiles: newAttachments,
        removedIds: Array.from(removedAttachmentIds),
      });
      setNewAttachments([]);
      setRemovedAttachmentIds(new Set());
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5 px-4 pt-4"
    >
      <ExpenseCoreFields
        control={control}
        register={register}
        watch={watch}
        errors={errors}
        buckets={buckets}
        defaultCurrency={defaultCurrency as CurrencyCode}
        fields={fields}
        remove={remove}
        isSplit={isSplit}
        totalAmount={totalAmount}
        splitTotal={splitTotal}
        remainingAmount={remainingAmount}
        splitsMatch={splitsMatch}
        currencySymbol={currencySymbol}
        selectedCurrency={selectedCurrency}
        onToggleSplit={handleToggleSplit}
        onAddSplit={handleAddSplit}
        onAutoBalance={handleAutoBalance}
      />

      <div className="space-y-2">
        <Label htmlFor="expense-date">Transaction date</Label>
        <Controller
          control={control}
          name="transactionDate"
          render={({ field }) => (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="expense-date"
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 size-4" />
                  {field.value
                    ? formatTransactionDate(field.value)
                    : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value ? parseISO(field.value) : undefined}
                  onSelect={(date) => {
                    if (date) field.onChange(format(date, 'yyyy-MM-dd'));
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="expense-fixed">Fixed expense</Label>
        <Controller
          control={control}
          name="isFixed"
          render={({ field }) => (
            <Switch
              id="expense-fixed"
              checked={field.value ?? false}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="expense-notes">Notes (optional)</Label>
        <Input
          id="expense-notes"
          placeholder="Any additional notes…"
          {...register('notes')}
        />
      </div>

      <ExpenseAttachmentsSection
        visibleExistingAttachments={visibleExistingAttachments}
        newAttachments={newAttachments}
        onAddAttachments={handleAddAttachments}
        onViewAttachment={handleViewAttachment}
        onRemoveExistingAttachment={handleRemoveExistingAttachment}
        onRemoveNewAttachment={handleRemoveNewAttachment}
      />

      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1"
          disabled={isSubmitting || (isSplit && !splitsMatch)}
        >
          {isSubmitting && (
            <Loader2 className="size-4 motion-safe:animate-spin" />
          )}
          {expense ? 'Save Changes' : 'Add Expense'}
        </Button>
      </div>
    </form>
  );
}
