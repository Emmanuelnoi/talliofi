import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFieldArrayRemove,
  type UseFormRegister,
} from 'react-hook-form';
import { Plus, X } from 'lucide-react';
import type { BucketAllocation } from '@/domain/plan';
import { MoneyInput } from '@/components/forms/money-input';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { CurrencyCode } from '@/domain/money';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CATEGORY_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { ExpenseFormData } from '../types';

interface ExpenseSplitSectionProps {
  fields: { id: string }[];
  control: Control<ExpenseFormData>;
  register: UseFormRegister<ExpenseFormData>;
  errors: FieldErrors<ExpenseFormData>;
  buckets: BucketAllocation[];
  totalAmount: number;
  splitTotal: number;
  remainingAmount: number;
  splitsMatch: boolean;
  currencySymbol: string;
  selectedCurrency: CurrencyCode;
  remove: UseFieldArrayRemove;
  onAddSplit: () => void;
  onAutoBalance: () => void;
}

export function ExpenseSplitSection({
  fields,
  control,
  register,
  errors,
  buckets,
  totalAmount,
  splitTotal,
  remainingAmount,
  splitsMatch,
  currencySymbol,
  selectedCurrency,
  remove,
  onAddSplit,
  onAutoBalance,
}: ExpenseSplitSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="font-medium">Split allocations</Label>
        <div className="flex items-center gap-2">
          {!splitsMatch && fields.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onAutoBalance}
              className="h-7 text-xs"
            >
              Auto-balance
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddSplit}
            className="h-7"
          >
            <Plus className="size-3" />
            Add split
          </Button>
        </div>
      </div>

      <div
        className={cn(
          'flex items-center justify-between rounded-md px-3 py-2 text-sm',
          splitsMatch
            ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400'
            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
        )}
      >
        <span>
          Split total: {currencySymbol}
          {splitTotal.toFixed(2)} / {currencySymbol}
          {totalAmount.toFixed(2)}
        </span>
        {!splitsMatch && (
          <span className="font-medium">
            {remainingAmount > 0 ? '+' : ''}
            {currencySymbol}
            {remainingAmount.toFixed(2)}{' '}
            {remainingAmount > 0 ? 'remaining' : 'over'}
          </span>
        )}
        {splitsMatch && <span className="font-medium">Balanced</span>}
      </div>

      <div className="space-y-3">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="bg-muted/30 space-y-2 rounded-lg border p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-medium">
                Split {index + 1}
              </span>
              {fields.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  className="size-6"
                  aria-label={`Remove split ${index + 1}`}
                >
                  <X className="size-3" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor={`split-${index}-bucket`} className="text-xs">
                  Bucket
                </Label>
                <Controller
                  control={control}
                  name={`splits.${index}.bucketId`}
                  render={({ field: splitField }) => (
                    <Select
                      value={splitField.value}
                      onValueChange={splitField.onChange}
                    >
                      <SelectTrigger
                        id={`split-${index}-bucket`}
                        className="h-8"
                      >
                        <SelectValue placeholder="Select bucket" />
                      </SelectTrigger>
                      <SelectContent>
                        {buckets.map((bucket) => (
                          <SelectItem key={bucket.id} value={bucket.id}>
                            <span
                              className="mr-1.5 inline-block size-2 rounded-full"
                              style={{ backgroundColor: bucket.color }}
                              aria-hidden="true"
                            />
                            {bucket.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor={`split-${index}-category`} className="text-xs">
                  Category
                </Label>
                <Controller
                  control={control}
                  name={`splits.${index}.category`}
                  render={({ field: splitField }) => (
                    <Select
                      value={splitField.value}
                      onValueChange={splitField.onChange}
                    >
                      <SelectTrigger
                        id={`split-${index}-category`}
                        className="h-8"
                      >
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
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor={`split-${index}-amount`} className="text-xs">
                  Amount
                </Label>
                <Controller
                  control={control}
                  name={`splits.${index}.amountDollars`}
                  render={({ field: splitField }) => (
                    <MoneyInput
                      id={`split-${index}-amount`}
                      value={splitField.value}
                      onChange={splitField.onChange}
                      onBlur={splitField.onBlur}
                      min={0}
                      currencyCode={selectedCurrency}
                      className="h-8"
                    />
                  )}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor={`split-${index}-notes`} className="text-xs">
                  Notes
                </Label>
                <Input
                  id={`split-${index}-notes`}
                  placeholder="Optional"
                  className="h-8"
                  {...register(`splits.${index}.notes`)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {errors.splits && (
        <p id="expense-splits-error" role="alert" className="text-destructive text-sm">
          {typeof errors.splits === 'object' && 'message' in errors.splits
            ? errors.splits.message
            : 'Split amounts must sum to the total'}
        </p>
      )}
    </div>
  );
}
