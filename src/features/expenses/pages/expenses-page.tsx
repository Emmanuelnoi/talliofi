import { useCallback, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Filter,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Receipt,
  SortAsc,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryStates, parseAsString } from 'nuqs';
import { z } from 'zod';
import { FrequencySchema, ExpenseCategorySchema } from '@/domain/plan/schemas';
import {
  dollarsToCents,
  centsToDollars,
  formatMoney,
  cents,
  addMoney,
} from '@/domain/money';
import { normalizeToMonthly } from '@/domain/plan';
import type { ExpenseItem, BucketAllocation } from '@/domain/plan';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/feedback/empty-state';
import { MoneyInput } from '@/components/forms/money-input';
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
import { Card, CardContent } from '@/components/ui/card';
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
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
} from '@/hooks/use-plan-mutations';
import { FREQUENCY_LABELS, CATEGORY_LABELS } from '@/lib/constants';

/**
 * Form schema where isFixed is required (not defaulted) to avoid
 * input/output type mismatch with react-hook-form's zodResolver.
 */
const ExpenseFormSchema = z.object({
  name: z.string().min(1).max(100),
  amountDollars: z.number().positive(),
  frequency: FrequencySchema,
  category: ExpenseCategorySchema,
  bucketId: z.string().uuid(),
  isFixed: z.boolean(),
  notes: z.string().max(500).optional(),
});

type ExpenseFormData = z.infer<typeof ExpenseFormSchema>;

type SortField = 'name' | 'amount' | 'category' | 'createdAt';

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'amount', label: 'Amount' },
  { value: 'category', label: 'Category' },
  { value: 'createdAt', label: 'Date added' },
];

export default function ExpensesPage() {
  const { data: plan, isLoading: planLoading } = useActivePlan();
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses(
    plan?.id,
  );
  const { data: buckets = [] } = useBuckets(plan?.id);

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(
    null,
  );
  const [deletingExpense, setDeletingExpense] = useState<ExpenseItem | null>(
    null,
  );

  // URL-based filter/sort state
  const [filters, setFilters] = useQueryStates({
    category: parseAsString.withDefault(''),
    bucket: parseAsString.withDefault(''),
    frequency: parseAsString.withDefault(''),
    fixed: parseAsString.withDefault(''),
    sort: parseAsString.withDefault('name'),
  });

  const hasActiveFilters = !!(
    filters.category ||
    filters.bucket ||
    filters.frequency ||
    filters.fixed
  );

  const clearFilters = useCallback(() => {
    void setFilters({
      category: '',
      bucket: '',
      frequency: '',
      fixed: '',
    });
  }, [setFilters]);

  // Create a lookup from bucket id to bucket
  const bucketMap = useMemo(() => {
    const map = new Map<string, BucketAllocation>();
    for (const b of buckets) {
      map.set(b.id, b);
    }
    return map;
  }, [buckets]);

  // Filtered and sorted expenses
  const filteredExpenses = useMemo(() => {
    let result = [...expenses];

    if (filters.category) {
      result = result.filter((e) => e.category === filters.category);
    }
    if (filters.bucket) {
      result = result.filter((e) => e.bucketId === filters.bucket);
    }
    if (filters.frequency) {
      result = result.filter((e) => e.frequency === filters.frequency);
    }
    if (filters.fixed === 'true') {
      result = result.filter((e) => e.isFixed);
    } else if (filters.fixed === 'false') {
      result = result.filter((e) => !e.isFixed);
    }

    const sortField = (filters.sort || 'name') as SortField;
    result.sort((a, b) => {
      switch (sortField) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'amount': {
          const aMonthly = normalizeToMonthly(a.amountCents, a.frequency);
          const bMonthly = normalizeToMonthly(b.amountCents, b.frequency);
          return bMonthly - aMonthly; // highest first
        }
        case 'category':
          return a.category.localeCompare(b.category);
        case 'createdAt':
          return b.createdAt.localeCompare(a.createdAt); // newest first
        default:
          return 0;
      }
    });

    return result;
  }, [expenses, filters]);

  // --- Handlers ---
  const handleOpenAdd = useCallback(() => {
    setEditingExpense(null);
    setSheetOpen(true);
  }, []);

  const handleOpenEdit = useCallback((expense: ExpenseItem) => {
    setEditingExpense(expense);
    setSheetOpen(true);
  }, []);

  const handleSave = useCallback(
    async (data: ExpenseFormData) => {
      if (!plan) return;
      const now = new Date().toISOString();

      try {
        if (editingExpense) {
          const updated: ExpenseItem = {
            ...editingExpense,
            name: data.name,
            amountCents: dollarsToCents(data.amountDollars),
            frequency: data.frequency,
            category: data.category,
            bucketId: data.bucketId,
            isFixed: data.isFixed ?? false,
            notes: data.notes,
            updatedAt: now,
          };
          await updateExpense.mutateAsync(updated);
          toast.success('Expense updated');
        } else {
          const expense: ExpenseItem = {
            id: crypto.randomUUID(),
            planId: plan.id,
            name: data.name,
            amountCents: dollarsToCents(data.amountDollars),
            frequency: data.frequency,
            category: data.category,
            bucketId: data.bucketId,
            isFixed: data.isFixed ?? false,
            notes: data.notes,
            createdAt: now,
            updatedAt: now,
          };
          await createExpense.mutateAsync(expense);
          toast.success('Expense added');
        }
        setSheetOpen(false);
        setEditingExpense(null);
      } catch {
        toast.error('Failed to save expense');
      }
    },
    [plan, editingExpense, createExpense, updateExpense],
  );

  const handleDelete = useCallback(async () => {
    if (!deletingExpense || !plan) return;
    try {
      await deleteExpense.mutateAsync({
        id: deletingExpense.id,
        planId: plan.id,
      });
      toast.success('Expense deleted');
      setDeletingExpense(null);
    } catch {
      toast.error('Failed to delete expense. Please try again.');
    }
  }, [deletingExpense, plan, deleteExpense]);

  const totalMonthly = useMemo(() => {
    return filteredExpenses.reduce(
      (sum, e) => addMoney(sum, normalizeToMonthly(e.amountCents, e.frequency)),
      cents(0),
    );
  }, [filteredExpenses]);

  const isLoading = planLoading || expensesLoading;

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
          title="Expenses"
          description="Complete onboarding to start tracking expenses."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Track and manage your recurring expenses."
        action={
          <Button size="sm" onClick={handleOpenAdd}>
            <Plus className="size-4" />
            Add expense
          </Button>
        }
      />

      {/* Filters and sort */}
      {expenses.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-3">
              <Filter className="text-muted-foreground size-4 shrink-0" />

              <Select
                value={filters.category}
                onValueChange={(val) =>
                  void setFilters({ category: val === 'all' ? '' : val })
                }
              >
                <SelectTrigger
                  className="h-8 w-[140px]"
                  aria-label="Filter by category"
                >
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {buckets.length > 0 && (
                <Select
                  value={filters.bucket}
                  onValueChange={(val) =>
                    void setFilters({ bucket: val === 'all' ? '' : val })
                  }
                >
                  <SelectTrigger
                    className="h-8 w-[140px]"
                    aria-label="Filter by bucket"
                  >
                    <SelectValue placeholder="Bucket" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All buckets</SelectItem>
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
              )}

              <Select
                value={filters.frequency}
                onValueChange={(val) =>
                  void setFilters({ frequency: val === 'all' ? '' : val })
                }
              >
                <SelectTrigger
                  className="h-8 w-[140px]"
                  aria-label="Filter by frequency"
                >
                  <SelectValue placeholder="Frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All frequencies</SelectItem>
                  {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.fixed}
                onValueChange={(val) =>
                  void setFilters({ fixed: val === 'all' ? '' : val })
                }
              >
                <SelectTrigger
                  className="h-8 w-[120px]"
                  aria-label="Filter by expense type"
                >
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="true">Fixed</SelectItem>
                  <SelectItem value="false">Variable</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-1.5">
                <SortAsc className="text-muted-foreground size-4 shrink-0" />
                <Select
                  value={filters.sort}
                  onValueChange={(val) => void setFilters({ sort: val })}
                >
                  <SelectTrigger className="h-8 w-[120px]" aria-label="Sort by">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8"
                >
                  <X className="size-3" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {filteredExpenses.length > 0 && (
        <div className="text-muted-foreground text-sm">
          {filteredExpenses.length} expense
          {filteredExpenses.length !== 1 && 's'}
          {hasActiveFilters &&
            ` (filtered from ${expenses.length})`} &mdash;{' '}
          <span className="font-medium tabular-nums">
            {formatMoney(totalMonthly)}
          </span>
          /mo
        </div>
      )}

      {/* Expense list */}
      {expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses yet"
          description="Add your recurring expenses to start tracking your budget."
          action={{
            label: 'Add your first expense',
            onClick: handleOpenAdd,
          }}
        />
      ) : filteredExpenses.length === 0 ? (
        <EmptyState
          icon={Filter}
          title="No matching expenses"
          description="Try adjusting your filters to see more results."
          action={{
            label: 'Clear filters',
            onClick: clearFilters,
          }}
        />
      ) : (
        <div className="space-y-3">
          {filteredExpenses.map((expense) => {
            const monthly = normalizeToMonthly(
              expense.amountCents,
              expense.frequency,
            );
            const bucket = bucketMap.get(expense.bucketId);
            const showNormalized = expense.frequency !== 'monthly';

            return (
              <Card key={expense.id}>
                <CardContent className="flex items-center gap-4 py-4">
                  {/* Color swatch */}
                  {bucket && (
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: bucket.color }}
                      aria-hidden="true"
                    />
                  )}

                  {/* Name + meta */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">
                        {expense.name}
                      </span>
                      <Badge
                        variant={expense.isFixed ? 'secondary' : 'outline'}
                        className="shrink-0"
                      >
                        {expense.isFixed ? 'Fixed' : 'Variable'}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                      <span>{CATEGORY_LABELS[expense.category]}</span>
                      {bucket && (
                        <>
                          <span aria-hidden="true">&middot;</span>
                          <span>{bucket.name}</span>
                        </>
                      )}
                      <span aria-hidden="true">&middot;</span>
                      <span>{FREQUENCY_LABELS[expense.frequency]}</span>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="shrink-0 text-right">
                    <div className="font-medium tabular-nums">
                      {formatMoney(expense.amountCents)}
                      {showNormalized && (
                        <span className="text-muted-foreground text-xs">
                          /
                          {expense.frequency === 'weekly'
                            ? 'wk'
                            : expense.frequency === 'biweekly'
                              ? '2wk'
                              : expense.frequency === 'quarterly'
                                ? 'qtr'
                                : expense.frequency === 'annual'
                                  ? 'yr'
                                  : expense.frequency === 'semimonthly'
                                    ? '2mo'
                                    : 'mo'}
                        </span>
                      )}
                    </div>
                    {showNormalized && (
                      <div className="text-muted-foreground text-xs tabular-nums">
                        {formatMoney(monthly)}/mo
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0"
                        aria-label={`Actions for ${expense.name}`}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenEdit(expense)}>
                        <Pencil className="size-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeletingExpense(expense)}
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
              {editingExpense ? 'Edit expense' : 'New expense'}
            </SheetTitle>
            <SheetDescription>
              {editingExpense
                ? 'Update this recurring expense.'
                : 'Add a new recurring expense to your budget.'}
            </SheetDescription>
          </SheetHeader>
          <ExpenseForm
            key={editingExpense?.id ?? 'new'}
            expense={editingExpense}
            buckets={buckets}
            onSave={handleSave}
            onCancel={() => setSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingExpense}
        onOpenChange={(open) => {
          if (!open) setDeletingExpense(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{deletingExpense?.name}
              &rdquo; from your budget.
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
    </div>
  );
}

// --- Expense Form ---

interface ExpenseFormProps {
  expense: ExpenseItem | null;
  buckets: BucketAllocation[];
  onSave: (data: ExpenseFormData) => Promise<void>;
  onCancel: () => void;
}

function ExpenseForm({ expense, buckets, onSave, onCancel }: ExpenseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(ExpenseFormSchema),
    defaultValues: expense
      ? {
          name: expense.name,
          amountDollars: centsToDollars(expense.amountCents),
          frequency: expense.frequency,
          category: expense.category,
          bucketId: expense.bucketId,
          isFixed: expense.isFixed,
          notes: expense.notes ?? '',
        }
      : {
          name: '',
          amountDollars: 0,
          frequency: 'monthly',
          category: 'other',
          bucketId: buckets[0]?.id ?? '',
          isFixed: false,
          notes: '',
        },
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = form;

  const onSubmit = async (data: ExpenseFormData) => {
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

      <div className="grid grid-cols-2 gap-3">
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

      <div className="grid grid-cols-2 gap-3">
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
          placeholder="Any additional notes..."
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
          {expense ? 'Save changes' : 'Add expense'}
        </Button>
      </div>
    </form>
  );
}
