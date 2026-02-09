import { useCallback, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  CreditCard,
} from 'lucide-react';
import { toast } from 'sonner';
import type { z } from 'zod';
import { LiabilityFormSchema } from '@/domain/plan/schemas';
import { dollarsToCents, centsToDollars, formatMoney } from '@/domain/money';
import type { Liability, LiabilityCategory } from '@/domain/plan';
import { EmptyState } from '@/components/feedback/empty-state';
import { MoneyInput } from '@/components/forms/money-input';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import {
  LIABILITY_CATEGORY_LABELS,
  LIABILITY_CATEGORY_COLORS,
} from '@/lib/constants';

type LiabilityFormData = z.infer<typeof LiabilityFormSchema>;

interface LiabilityListProps {
  liabilities: Liability[];
  planId: string;
  onCreateLiability: (liability: Liability) => Promise<void>;
  onUpdateLiability: (liability: Liability) => Promise<void>;
  onDeleteLiability: (id: string) => Promise<void>;
}

export function LiabilityList({
  liabilities,
  planId,
  onCreateLiability,
  onUpdateLiability,
  onDeleteLiability,
}: LiabilityListProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingLiability, setEditingLiability] = useState<Liability | null>(
    null,
  );
  const [deletingLiability, setDeletingLiability] = useState<Liability | null>(
    null,
  );

  const handleOpenAdd = useCallback(() => {
    setEditingLiability(null);
    setSheetOpen(true);
  }, []);

  const handleOpenEdit = useCallback((liability: Liability) => {
    setEditingLiability(liability);
    setSheetOpen(true);
  }, []);

  const handleSave = useCallback(
    async (data: LiabilityFormData) => {
      const now = new Date().toISOString();

      try {
        if (editingLiability) {
          const updated: Liability = {
            ...editingLiability,
            name: data.name,
            category: data.category,
            balanceCents: dollarsToCents(data.balanceDollars),
            interestRate: data.interestRate,
            minimumPaymentCents: data.minimumPaymentDollars
              ? dollarsToCents(data.minimumPaymentDollars)
              : undefined,
            notes: data.notes,
            updatedAt: now,
          };
          await onUpdateLiability(updated);
          toast.success('Liability updated');
        } else {
          const liability: Liability = {
            id: crypto.randomUUID(),
            planId,
            name: data.name,
            category: data.category,
            balanceCents: dollarsToCents(data.balanceDollars),
            interestRate: data.interestRate,
            minimumPaymentCents: data.minimumPaymentDollars
              ? dollarsToCents(data.minimumPaymentDollars)
              : undefined,
            notes: data.notes,
            createdAt: now,
            updatedAt: now,
          };
          await onCreateLiability(liability);
          toast.success('Liability added');
        }
        setSheetOpen(false);
        setEditingLiability(null);
      } catch {
        toast.error('Failed to save liability');
      }
    },
    [planId, editingLiability, onCreateLiability, onUpdateLiability],
  );

  const handleDelete = useCallback(async () => {
    if (!deletingLiability) return;
    try {
      await onDeleteLiability(deletingLiability.id);
      toast.success('Liability deleted');
      setDeletingLiability(null);
    } catch {
      toast.error('Failed to delete liability');
    }
  }, [deletingLiability, onDeleteLiability]);

  // Group liabilities by category
  const liabilitiesByCategory = liabilities.reduce(
    (acc, liability) => {
      if (!acc[liability.category]) {
        acc[liability.category] = [];
      }
      acc[liability.category].push(liability);
      return acc;
    },
    {} as Record<LiabilityCategory, Liability[]>,
  );

  const categories = Object.keys(liabilitiesByCategory) as LiabilityCategory[];

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">Liabilities</CardTitle>
          <Button size="sm" onClick={handleOpenAdd}>
            <Plus className="size-4" />
            Add Liability
          </Button>
        </CardHeader>
        <CardContent>
          {liabilities.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No liabilities yet"
              description="Add your debts like credit cards, loans, and mortgages."
              action={{
                label: 'Add your first liability',
                onClick: handleOpenAdd,
              }}
            />
          ) : (
            <div className="space-y-6">
              {categories.map((category) => (
                <div key={category}>
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className="size-3 rounded-full"
                      style={{
                        backgroundColor: LIABILITY_CATEGORY_COLORS[category],
                      }}
                      aria-hidden="true"
                    />
                    <h4 className="text-sm font-medium">
                      {LIABILITY_CATEGORY_LABELS[category]}
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {liabilitiesByCategory[category].map((liability) => (
                      <div
                        key={liability.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">
                            {liability.name}
                          </p>
                          <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
                            {liability.interestRate !== undefined && (
                              <span>{liability.interestRate}% APR</span>
                            )}
                            {liability.minimumPaymentCents && (
                              <>
                                {liability.interestRate !== undefined && (
                                  <span aria-hidden="true">&middot;</span>
                                )}
                                <span>
                                  Min:{' '}
                                  {formatMoney(liability.minimumPaymentCents)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold tabular-nums text-red-600 dark:text-red-400">
                            {formatMoney(liability.balanceCents)}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                aria-label={`Actions for ${liability.name}`}
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleOpenEdit(liability)}
                              >
                                <Pencil className="size-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setDeletingLiability(liability)}
                              >
                                <Trash2 className="size-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {editingLiability ? 'Edit Liability' : 'Add Liability'}
            </SheetTitle>
            <SheetDescription>
              {editingLiability
                ? 'Update this debt in your records.'
                : 'Add a new debt to track your net worth.'}
            </SheetDescription>
          </SheetHeader>
          <LiabilityForm
            key={editingLiability?.id ?? 'new'}
            liability={editingLiability}
            onSave={handleSave}
            onCancel={() => setSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingLiability}
        onOpenChange={(open) => {
          if (!open) setDeletingLiability(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete liability?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{deletingLiability?.name}
              &rdquo; from your liabilities.
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
    </>
  );
}

// --- Liability Form ---

interface LiabilityFormProps {
  liability: Liability | null;
  onSave: (data: LiabilityFormData) => Promise<void>;
  onCancel: () => void;
}

function LiabilityForm({ liability, onSave, onCancel }: LiabilityFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LiabilityFormData>({
    resolver: zodResolver(LiabilityFormSchema),
    defaultValues: liability
      ? {
          name: liability.name,
          category: liability.category,
          balanceDollars: centsToDollars(liability.balanceCents),
          interestRate: liability.interestRate,
          minimumPaymentDollars: liability.minimumPaymentCents
            ? centsToDollars(liability.minimumPaymentCents)
            : undefined,
          notes: liability.notes ?? '',
        }
      : {
          name: '',
          category: 'credit_card',
          balanceDollars: 0,
          interestRate: undefined,
          minimumPaymentDollars: undefined,
          notes: '',
        },
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = form;

  const onSubmit = async (data: LiabilityFormData) => {
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
      className="flex flex-col gap-5 px-4 pt-4"
    >
      <div className="space-y-2">
        <Label htmlFor="liability-name">Name</Label>
        <Input
          id="liability-name"
          placeholder="e.g., Chase Credit Card"
          aria-invalid={!!errors.name}
          {...register('name')}
        />
        {errors.name && (
          <p className="text-destructive text-sm">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="liability-category">Category</Label>
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="liability-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LIABILITY_CATEGORY_LABELS).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2 rounded-full"
                          style={{
                            backgroundColor:
                              LIABILITY_CATEGORY_COLORS[
                                value as LiabilityCategory
                              ],
                          }}
                        />
                        {label}
                      </span>
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="liability-balance">Current Balance</Label>
        <Controller
          control={control}
          name="balanceDollars"
          render={({ field, fieldState }) => (
            <>
              <MoneyInput
                id="liability-balance"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                min={0}
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

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="liability-interest">Interest Rate (%)</Label>
          <Input
            id="liability-interest"
            type="number"
            step="0.01"
            min="0"
            max="100"
            placeholder="e.g., 19.99"
            {...register('interestRate', { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="liability-min-payment">Min. Payment</Label>
          <Controller
            control={control}
            name="minimumPaymentDollars"
            render={({ field }) => (
              <MoneyInput
                id="liability-min-payment"
                value={field.value ?? 0}
                onChange={field.onChange}
                onBlur={field.onBlur}
                min={0}
              />
            )}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="liability-notes">Notes (optional)</Label>
        <Textarea
          id="liability-notes"
          placeholder="Any additional details..."
          {...register('notes')}
        />
      </div>

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
          {liability ? 'Save changes' : 'Add liability'}
        </Button>
      </div>
    </form>
  );
}
