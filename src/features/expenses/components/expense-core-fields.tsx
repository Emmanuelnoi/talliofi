import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFieldArrayRemove,
  type UseFormRegister,
  type UseFormWatch,
} from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { MoneyInput } from '@/components/forms/money-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { BucketAllocation } from '@/domain/plan';
import { SUPPORTED_CURRENCIES, type CurrencyCode } from '@/domain/money';
import { CATEGORY_LABELS, FREQUENCY_LABELS } from '@/lib/constants';
import { ExpenseSplitSection } from './expense-split-section';
import type { ExpenseFormData } from '../types';

interface ExpenseCoreFieldsProps {
  control: Control<ExpenseFormData>;
  register: UseFormRegister<ExpenseFormData>;
  watch: UseFormWatch<ExpenseFormData>;
  errors: FieldErrors<ExpenseFormData>;
  buckets: BucketAllocation[];
  defaultCurrency: CurrencyCode;
  fields: { id: string }[];
  remove: UseFieldArrayRemove;
  isSplit: boolean;
  totalAmount: number;
  splitTotal: number;
  remainingAmount: number;
  splitsMatch: boolean;
  currencySymbol: string;
  selectedCurrency: CurrencyCode;
  onToggleSplit: (enabled: boolean) => void;
  onAddSplit: () => void;
  onAutoBalance: () => void;
}

export function ExpenseCoreFields({
  control,
  register,
  watch,
  errors,
  buckets,
  defaultCurrency,
  fields,
  remove,
  isSplit,
  totalAmount,
  splitTotal,
  remainingAmount,
  splitsMatch,
  currencySymbol,
  selectedCurrency,
  onToggleSplit,
  onAddSplit,
  onAutoBalance,
}: ExpenseCoreFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="expense-name">Name</Label>
        <Input
          id="expense-name"
          placeholder="e.g., Rent"
          aria-invalid={!!errors.name}
          {...register('name')}
        />
        {errors.name && (
          <p className="text-destructive text-sm">{errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="expense-amount">Amount</Label>
          <Controller
            control={control}
            name="amountDollars"
            render={({ field, fieldState }) => (
              <>
                <MoneyInput
                  id="expense-amount"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  min={0}
                  currencyCode={watch('currencyCode') ?? defaultCurrency}
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
          <Label htmlFor="expense-currency">Currency</Label>
          <Controller
            control={control}
            name="currencyCode"
            render={({ field }) => (
              <Select
                value={field.value ?? defaultCurrency}
                onValueChange={(value) => field.onChange(value as CurrencyCode)}
              >
                <SelectTrigger id="expense-currency">
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
          <Label htmlFor="expense-frequency">Frequency</Label>
          <Controller
            control={control}
            name="frequency"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="expense-frequency">
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

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="space-y-0.5">
          <Label htmlFor="expense-split" className="font-medium">
            Split this expense
          </Label>
          <p className="text-muted-foreground text-xs">
            Divide across multiple buckets or categories
          </p>
        </div>
        <Controller
          control={control}
          name="isSplit"
          render={({ field }) => (
            <Switch
              id="expense-split"
              checked={field.value ?? false}
              onCheckedChange={onToggleSplit}
            />
          )}
        />
      </div>

      {!isSplit && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="expense-category">Category</Label>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="expense-category">
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
            <Label htmlFor="expense-bucket">Bucket</Label>
            <Controller
              control={control}
              name="bucketId"
              render={({ field, fieldState }) => (
                <>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="expense-bucket">
                      <SelectValue placeholder="Select bucket" />
                    </SelectTrigger>
                    <SelectContent>
                      {buckets.map((bucket) => (
                        <SelectItem key={bucket.id} value={bucket.id}>
                          <span
                            className="mr-1.5 inline-block size-2 rounded-full"
                            style={{ backgroundColor: bucket.color }}
                          />
                          {bucket.name}
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
      )}

      {isSplit && (
        <ExpenseSplitSection
          fields={fields}
          control={control}
          register={register}
          errors={errors}
          buckets={buckets}
          totalAmount={totalAmount}
          splitTotal={splitTotal}
          remainingAmount={remainingAmount}
          splitsMatch={splitsMatch}
          currencySymbol={currencySymbol}
          selectedCurrency={selectedCurrency}
          remove={remove}
          onAddSplit={onAddSplit}
          onAutoBalance={onAutoBalance}
        />
      )}
    </>
  );
}
