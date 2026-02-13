import { Loader2 } from 'lucide-react';
import type { BucketAllocation } from '@/domain/plan';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CATEGORY_LABELS, FREQUENCY_LABELS } from '@/lib/constants';
import type { BulkEditFixedOption, BulkEditValues } from '../types';

interface ExpensesBulkEditDialogProps {
  open: boolean;
  selectedCount: number;
  selectedSplitCount: number;
  bulkEditValues: BulkEditValues;
  buckets: BucketAllocation[];
  hasChanges: boolean;
  isApplying: boolean;
  onOpenChange: (open: boolean) => void;
  onBulkEditValuesChange: (
    updater: (prev: BulkEditValues) => BulkEditValues,
  ) => void;
  onApply: () => void;
}

export function ExpensesBulkEditDialog({
  open,
  selectedCount,
  selectedSplitCount,
  bulkEditValues,
  buckets,
  hasChanges,
  isApplying,
  onOpenChange,
  onBulkEditValuesChange,
  onApply,
}: ExpensesBulkEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk edit expenses</DialogTitle>
          <DialogDescription>
            Apply changes to {selectedCount} selected expense
            {selectedCount !== 1 && 's'}. Fields set to “No change” will be left
            untouched.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={bulkEditValues.category}
              onValueChange={(value) =>
                onBulkEditValuesChange((prev) => ({
                  ...prev,
                  category: value as BulkEditValues['category'],
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no_change">No change</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Bucket</Label>
            <Select
              value={bulkEditValues.bucketId}
              onValueChange={(value) =>
                onBulkEditValuesChange((prev) => ({
                  ...prev,
                  bucketId: value,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no_change">No change</SelectItem>
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
            {selectedSplitCount > 0 && (
              <p className="text-muted-foreground text-xs">
                Category and bucket changes won’t apply to split expenses.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select
              value={bulkEditValues.frequency}
              onValueChange={(value) =>
                onBulkEditValuesChange((prev) => ({
                  ...prev,
                  frequency: value as BulkEditValues['frequency'],
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no_change">No change</SelectItem>
                {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={bulkEditValues.fixed}
              onValueChange={(value) =>
                onBulkEditValuesChange((prev) => ({
                  ...prev,
                  fixed: value as BulkEditFixedOption,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no_change">No change</SelectItem>
                <SelectItem value="fixed">Fixed</SelectItem>
                <SelectItem value="variable">Variable</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onApply} disabled={!hasChanges || isApplying}>
            {isApplying && (
              <Loader2 className="size-4 motion-safe:animate-spin" />
            )}
            Apply changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
