import { useCallback, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import type { z } from 'zod';
import { AssetFormSchema } from '@/domain/plan/schemas';
import { dollarsToCents, centsToDollars, formatMoney } from '@/domain/money';
import type { Asset, AssetCategory } from '@/domain/plan';
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
import { ASSET_CATEGORY_LABELS, ASSET_CATEGORY_COLORS } from '@/lib/constants';

type AssetFormData = z.infer<typeof AssetFormSchema>;

interface AssetListProps {
  assets: Asset[];
  planId: string;
  onCreateAsset: (asset: Asset) => Promise<void>;
  onUpdateAsset: (asset: Asset) => Promise<void>;
  onDeleteAsset: (id: string) => Promise<void>;
}

export function AssetList({
  assets,
  planId,
  onCreateAsset,
  onUpdateAsset,
  onDeleteAsset,
}: AssetListProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [deletingAsset, setDeletingAsset] = useState<Asset | null>(null);

  const handleOpenAdd = useCallback(() => {
    setEditingAsset(null);
    setSheetOpen(true);
  }, []);

  const handleOpenEdit = useCallback((asset: Asset) => {
    setEditingAsset(asset);
    setSheetOpen(true);
  }, []);

  const handleSave = useCallback(
    async (data: AssetFormData) => {
      const now = new Date().toISOString();

      try {
        if (editingAsset) {
          const updated: Asset = {
            ...editingAsset,
            name: data.name,
            category: data.category,
            valueCents: dollarsToCents(data.valueDollars),
            notes: data.notes,
            updatedAt: now,
          };
          await onUpdateAsset(updated);
          toast.success('Asset updated');
        } else {
          const asset: Asset = {
            id: crypto.randomUUID(),
            planId,
            name: data.name,
            category: data.category,
            valueCents: dollarsToCents(data.valueDollars),
            notes: data.notes,
            createdAt: now,
            updatedAt: now,
          };
          await onCreateAsset(asset);
          toast.success('Asset added');
        }
        setSheetOpen(false);
        setEditingAsset(null);
      } catch {
        toast.error('Failed to save asset');
      }
    },
    [planId, editingAsset, onCreateAsset, onUpdateAsset],
  );

  const handleDelete = useCallback(async () => {
    if (!deletingAsset) return;
    try {
      await onDeleteAsset(deletingAsset.id);
      toast.success('Asset deleted');
      setDeletingAsset(null);
    } catch {
      toast.error('Failed to delete asset');
    }
  }, [deletingAsset, onDeleteAsset]);

  // Group assets by category
  const assetsByCategory = assets.reduce(
    (acc, asset) => {
      if (!acc[asset.category]) {
        acc[asset.category] = [];
      }
      acc[asset.category].push(asset);
      return acc;
    },
    {} as Record<AssetCategory, Asset[]>,
  );

  const categories = Object.keys(assetsByCategory) as AssetCategory[];

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">Assets</CardTitle>
          <Button size="sm" onClick={handleOpenAdd}>
            <Plus className="size-4" />
            Add Asset
          </Button>
        </CardHeader>
        <CardContent>
          {assets.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No assets yet"
              description="Add your assets like savings, investments, property, and vehicles."
              action={{
                label: 'Add your first asset',
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
                        backgroundColor: ASSET_CATEGORY_COLORS[category],
                      }}
                      aria-hidden="true"
                    />
                    <h4 className="text-sm font-medium">
                      {ASSET_CATEGORY_LABELS[category]}
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {assetsByCategory[category].map((asset) => (
                      <div
                        key={asset.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{asset.name}</p>
                          {asset.notes && (
                            <p className="text-muted-foreground truncate text-xs">
                              {asset.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                            {formatMoney(asset.valueCents)}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                aria-label={`Actions for ${asset.name}`}
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleOpenEdit(asset)}
                              >
                                <Pencil className="size-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setDeletingAsset(asset)}
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
            <SheetTitle>{editingAsset ? 'Edit Asset' : 'Add Asset'}</SheetTitle>
            <SheetDescription>
              {editingAsset
                ? 'Update this asset in your portfolio.'
                : 'Add a new asset to track your net worth.'}
            </SheetDescription>
          </SheetHeader>
          <AssetForm
            key={editingAsset?.id ?? 'new'}
            asset={editingAsset}
            onSave={handleSave}
            onCancel={() => setSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingAsset}
        onOpenChange={(open) => {
          if (!open) setDeletingAsset(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete asset?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{deletingAsset?.name}&rdquo;
              from your assets.
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

// --- Asset Form ---

interface AssetFormProps {
  asset: Asset | null;
  onSave: (data: AssetFormData) => Promise<void>;
  onCancel: () => void;
}

function AssetForm({ asset, onSave, onCancel }: AssetFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AssetFormData>({
    resolver: zodResolver(AssetFormSchema),
    defaultValues: asset
      ? {
          name: asset.name,
          category: asset.category,
          valueDollars: centsToDollars(asset.valueCents),
          notes: asset.notes ?? '',
        }
      : {
          name: '',
          category: 'cash',
          valueDollars: 0,
          notes: '',
        },
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = form;

  const onSubmit = async (data: AssetFormData) => {
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
        <Label htmlFor="asset-name">Name</Label>
        <Input
          id="asset-name"
          placeholder="e.g., Savings Account"
          aria-invalid={!!errors.name}
          {...register('name')}
        />
        {errors.name && (
          <p className="text-destructive text-sm">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="asset-category">Category</Label>
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="asset-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ASSET_CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    <span className="flex items-center gap-2">
                      <span
                        className="size-2 rounded-full"
                        style={{
                          backgroundColor:
                            ASSET_CATEGORY_COLORS[value as AssetCategory],
                        }}
                      />
                      {label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="asset-value">Current Value</Label>
        <Controller
          control={control}
          name="valueDollars"
          render={({ field, fieldState }) => (
            <>
              <MoneyInput
                id="asset-value"
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
        <Label htmlFor="asset-notes">Notes (optional)</Label>
        <Textarea
          id="asset-notes"
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
          {asset ? 'Save changes' : 'Add asset'}
        </Button>
      </div>
    </form>
  );
}
