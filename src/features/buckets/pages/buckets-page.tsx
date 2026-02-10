import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { z } from 'zod';
import { BucketInputSchema } from '@/domain/plan/schemas';
import {
  dollarsToCents,
  centsToDollars,
  formatMoney,
  addMoney,
} from '@/domain/money';
import type { Cents } from '@/domain/money';
import type { BucketAllocation } from '@/domain/plan';
import { normalizeToMonthly } from '@/domain/plan';
import { cents } from '@/domain/money';
import { useCurrencyStore } from '@/stores/currency-store';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/feedback/empty-state';
import { MoneyInput } from '@/components/forms/money-input';
import { PercentInput } from '@/components/forms/percent-input';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { useActivePlan } from '@/hooks/use-active-plan';
import { useBuckets, useExpenses } from '@/hooks/use-plan-data';
import {
  useCreateBucket,
  useUpdateBucket,
  useDeleteBucket,
} from '@/hooks/use-plan-mutations';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { UnsavedChangesDialog } from '@/components/feedback/unsaved-changes-dialog';
import { BUCKET_COLORS } from '@/lib/constants';

type BucketFormData = z.input<typeof BucketInputSchema>;

export default function BucketsPage() {
  const { data: plan, isLoading: planLoading } = useActivePlan();
  const { data: buckets = [], isLoading: bucketsLoading } = useBuckets(
    plan?.id,
  );
  const { data: expenses = [] } = useExpenses(plan?.id);
  const currencyCode = useCurrencyStore((s) => s.currencyCode);

  const createBucket = useCreateBucket();
  const updateBucket = useUpdateBucket();
  const deleteBucket = useDeleteBucket();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetDirty, setSheetDirty] = useState(false);
  const [editingBucket, setEditingBucket] = useState<BucketAllocation | null>(
    null,
  );
  const [deletingBucket, setDeletingBucket] = useState<BucketAllocation | null>(
    null,
  );

  const { blocker, confirmNavigation, cancelNavigation } = useUnsavedChanges({
    isDirty: sheetOpen && sheetDirty,
  });

  // Compute spending per bucket
  const spendingByBucket = useMemo(() => {
    const map = new Map<string, Cents>();
    for (const expense of expenses) {
      const monthly = normalizeToMonthly(
        expense.amountCents,
        expense.frequency,
      );
      const existing = map.get(expense.bucketId) ?? cents(0);
      map.set(expense.bucketId, addMoney(existing, monthly));
    }
    return map;
  }, [expenses]);

  const totalPercentage = buckets.reduce(
    (sum, b) =>
      b.mode === 'percentage' ? sum + (b.targetPercentage ?? 0) : sum,
    0,
  );

  const handleOpenAdd = () => {
    setEditingBucket(null);
    setSheetDirty(false);
    setSheetOpen(true);
  };

  const handleOpenEdit = (bucket: BucketAllocation) => {
    setEditingBucket(bucket);
    setSheetDirty(false);
    setSheetOpen(true);
  };

  const handleSave = async (data: BucketFormData) => {
    if (!plan) return;

    try {
      if (editingBucket) {
        const updated: BucketAllocation = {
          ...editingBucket,
          name: data.name,
          color: data.color,
          mode: data.mode,
          targetPercentage:
            data.mode === 'percentage' ? data.targetPercentage : undefined,
          targetAmountCents:
            data.mode === 'fixed' && data.targetAmountDollars != null
              ? dollarsToCents(data.targetAmountDollars)
              : undefined,
          rolloverEnabled: data.rolloverEnabled ?? false,
        };
        await updateBucket.mutateAsync(updated);
        toast.success('Bucket updated');
      } else {
        const bucket: BucketAllocation = {
          id: crypto.randomUUID(),
          planId: plan.id,
          name: data.name,
          color: data.color,
          mode: data.mode,
          targetPercentage:
            data.mode === 'percentage' ? data.targetPercentage : undefined,
          targetAmountCents:
            data.mode === 'fixed' && data.targetAmountDollars != null
              ? dollarsToCents(data.targetAmountDollars)
              : undefined,
          rolloverEnabled: data.rolloverEnabled ?? false,
          sortOrder: buckets.length,
          createdAt: new Date().toISOString(),
        };
        await createBucket.mutateAsync(bucket);
        toast.success('Bucket created');
      }
      setSheetOpen(false);
      setEditingBucket(null);
    } catch {
      toast.error('Failed to save bucket');
    }
  };

  const handleDelete = async () => {
    if (!deletingBucket || !plan) return;
    const expenseCount = expenses.filter(
      (e) => e.bucketId === deletingBucket.id,
    ).length;
    try {
      await deleteBucket.mutateAsync({
        id: deletingBucket.id,
        planId: plan.id,
      });
      if (expenseCount > 0) {
        toast.success(
          `Bucket deleted. ${expenseCount} expense(s) were unassigned.`,
        );
      } else {
        toast.success('Bucket deleted');
      }
      setDeletingBucket(null);
    } catch {
      toast.error('Failed to delete bucket. Please try again.');
    }
  };

  const isLoading = planLoading || bucketsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Buckets"
          description="Complete onboarding to set up buckets."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buckets"
        description="Organize your budget into spending categories."
        action={
          <Button size="sm" onClick={handleOpenAdd}>
            <Plus className="size-4" />
            Add bucket
          </Button>
        }
      />

      {/* Allocation bar */}
      {buckets.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">Budget allocation</span>
                <span className="tabular-nums">
                  {totalPercentage.toFixed(0)}% of 100%
                </span>
              </div>
              <div className="bg-muted flex h-3 overflow-hidden rounded-full">
                {buckets
                  .filter((b) => b.mode === 'percentage' && b.targetPercentage)
                  .map((b) => (
                    <div
                      key={b.id}
                      className="transition-all duration-300"
                      style={{
                        width: `${b.targetPercentage}%`,
                        backgroundColor: b.color,
                      }}
                      title={`${b.name}: ${b.targetPercentage}%`}
                    />
                  ))}
              </div>
              {totalPercentage > 100 && (
                <p
                  className="text-sm"
                  style={{ color: 'var(--deficit, #ef4444)' }}
                >
                  Over-allocated by {(totalPercentage - 100).toFixed(0)}%
                </p>
              )}
              {totalPercentage < 100 && totalPercentage > 0 && (
                <p className="text-muted-foreground text-sm">
                  {(100 - totalPercentage).toFixed(0)}% unallocated
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bucket list */}
      {buckets.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="No buckets yet"
          description="Create spending buckets to organize your budget. Try the popular 50/30/20 approach."
          action={{
            label: 'Add your first bucket',
            onClick: handleOpenAdd,
          }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {buckets.map((bucket) => {
            const spent = spendingByBucket.get(bucket.id) ?? cents(0);
            return (
              <Card key={bucket.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-3 rounded-full"
                        style={{ backgroundColor: bucket.color }}
                        aria-hidden="true"
                      />
                      <CardTitle className="text-base">{bucket.name}</CardTitle>
                      {bucket.rolloverEnabled && (
                        <Badge variant="secondary" className="text-xs">
                          Rollover
                        </Badge>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          aria-label={`Actions for ${bucket.name}`}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleOpenEdit(bucket)}
                        >
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeletingBucket(bucket)}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline justify-between">
                    <Badge variant="outline">
                      {bucket.mode === 'percentage'
                        ? `${bucket.targetPercentage}%`
                        : formatMoney(bucket.targetAmountCents ?? cents(0), {
                            currency: currencyCode,
                          })}
                    </Badge>
                    <span className="text-muted-foreground text-sm tabular-nums">
                      {formatMoney(spent, { currency: currencyCode })} spent/mo
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {editingBucket ? 'Edit bucket' : 'New bucket'}
            </SheetTitle>
            <SheetDescription>
              {editingBucket
                ? 'Update this spending category.'
                : 'Create a new spending category for your budget.'}
            </SheetDescription>
          </SheetHeader>
          <BucketForm
            key={editingBucket?.id ?? 'new'}
            bucket={editingBucket}
            nextColorIndex={buckets.length}
            otherBucketsPercentage={buckets.reduce(
              (sum, b) =>
                b.id !== editingBucket?.id && b.mode === 'percentage'
                  ? sum + (b.targetPercentage ?? 0)
                  : sum,
              0,
            )}
            onSave={handleSave}
            onCancel={() => setSheetOpen(false)}
            onDirtyChange={setSheetDirty}
          />
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingBucket}
        onOpenChange={(open) => {
          if (!open) setDeletingBucket(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete bucket?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete &ldquo;{deletingBucket?.name}&rdquo;.
              {expenses.filter((e) => e.bucketId === deletingBucket?.id)
                .length > 0 &&
                ' Expenses assigned to this bucket will become unassigned.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UnsavedChangesDialog
        open={blocker.state === 'blocked'}
        onStay={cancelNavigation}
        onLeave={confirmNavigation}
      />
    </div>
  );
}

// --- Bucket form component ---

interface BucketFormProps {
  bucket: BucketAllocation | null;
  nextColorIndex: number;
  otherBucketsPercentage: number;
  onSave: (data: BucketFormData) => Promise<void>;
  onCancel: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

function BucketForm({
  bucket,
  nextColorIndex,
  otherBucketsPercentage,
  onSave,
  onCancel,
  onDirtyChange,
}: BucketFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BucketFormData>({
    resolver: zodResolver(BucketInputSchema),
    defaultValues: bucket
      ? {
          name: bucket.name,
          color: bucket.color,
          mode: bucket.mode,
          targetPercentage: bucket.targetPercentage ?? 0,
          targetAmountDollars: bucket.targetAmountCents
            ? centsToDollars(bucket.targetAmountCents)
            : 0,
          rolloverEnabled: bucket.rolloverEnabled ?? false,
        }
      : {
          name: '',
          color: BUCKET_COLORS[nextColorIndex % BUCKET_COLORS.length],
          mode: 'percentage',
          targetPercentage: 0,
          rolloverEnabled: false,
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

  useEffect(() => {
    if (!onDirtyChange) return;
    onDirtyChange(form.formState.isDirty);
  }, [form.formState.isDirty, onDirtyChange, form]);

  const mode = watch('mode');
  const currentPercentage = watch('targetPercentage') ?? 0;
  const maxAllowedPercentage = 100 - otherBucketsPercentage;
  const wouldExceed =
    mode === 'percentage' && currentPercentage > maxAllowedPercentage;

  const onSubmit = async (data: BucketFormData) => {
    setIsSubmitting(true);
    try {
      await onSave(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6 px-4 pt-4"
    >
      <div className="space-y-2">
        <Label htmlFor="bucket-name">Name</Label>
        <div className="flex gap-2">
          <input
            type="color"
            className="h-9 w-9 shrink-0 cursor-pointer rounded-md border"
            value={watch('color')}
            onChange={(e) => setValue('color', e.target.value)}
            aria-label="Bucket color"
          />
          <Input
            id="bucket-name"
            placeholder="e.g., Essentials"
            aria-invalid={!!errors.name}
            {...register('name')}
          />
        </div>
        {errors.name && (
          <p className="text-destructive text-sm">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="bucket-mode">Type</Label>
        <Select
          value={mode}
          onValueChange={(val) =>
            setValue('mode', val as 'percentage' | 'fixed')
          }
        >
          <SelectTrigger id="bucket-mode">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="percentage">Percentage of net income</SelectItem>
            <SelectItem value="fixed">Fixed dollar amount</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="space-y-0.5">
          <Label htmlFor="bucket-rollover" className="font-medium">
            Enable rollover
          </Label>
          <p className="text-muted-foreground text-xs">
            Carry unused budget into the next month.
          </p>
        </div>
        <Controller
          control={control}
          name="rolloverEnabled"
          render={({ field }) => (
            <Switch
              id="bucket-rollover"
              checked={field.value ?? false}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </div>

      {mode === 'percentage' ? (
        <div className="space-y-2">
          <Label htmlFor="bucket-percentage">Target percentage</Label>
          <Controller
            control={control}
            name="targetPercentage"
            render={({ field }) => (
              <PercentInput
                id="bucket-percentage"
                value={field.value ?? 0}
                onChange={field.onChange}
                onBlur={field.onBlur}
                min={0}
                max={100}
              />
            )}
          />
          {wouldExceed && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Total allocation would be{' '}
              {(otherBucketsPercentage + currentPercentage).toFixed(0)}% (max
              100%). Available: {maxAllowedPercentage.toFixed(0)}%.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="bucket-amount">Target amount (monthly)</Label>
          <Controller
            control={control}
            name="targetAmountDollars"
            render={({ field }) => (
              <MoneyInput
                id="bucket-amount"
                value={field.value ?? 0}
                onChange={field.onChange}
                onBlur={field.onBlur}
                min={0}
              />
            )}
          />
        </div>
      )}

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
          disabled={isSubmitting || wouldExceed}
        >
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          {bucket ? 'Save changes' : 'Create bucket'}
        </Button>
      </div>
    </form>
  );
}
