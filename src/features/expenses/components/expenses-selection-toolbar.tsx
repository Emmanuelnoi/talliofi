import type { RefObject } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ExpensesSelectionToolbarProps {
  filteredCount: number;
  selectedCount: number;
  allVisibleSelected: boolean;
  hasSelection: boolean;
  selectAllRef: RefObject<HTMLInputElement | null>;
  onToggleSelectAllVisible: () => void;
  onOpenBulkEdit: () => void;
  onOpenBulkDelete: () => void;
  onClearSelection: () => void;
}

export function ExpensesSelectionToolbar({
  filteredCount,
  selectedCount,
  allVisibleSelected,
  hasSelection,
  selectAllRef,
  onToggleSelectAllVisible,
  onOpenBulkEdit,
  onOpenBulkDelete,
  onClearSelection,
}: ExpensesSelectionToolbarProps) {
  return (
    <>
      {filteredCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              ref={selectAllRef}
              type="checkbox"
              className="accent-primary size-4 rounded border"
              checked={allVisibleSelected}
              onChange={onToggleSelectAllVisible}
              aria-label="Select all visible expenses"
            />
            <span>Select all {filteredCount} visible</span>
          </label>
          <span className="text-muted-foreground">
            {selectedCount} selected
          </span>
        </div>
      )}

      {hasSelection && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="text-sm font-medium">{selectedCount} selected</div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onOpenBulkEdit}
                disabled={selectedCount === 0}
              >
                <Pencil className="size-4" />
                Bulk edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={onOpenBulkDelete}
                disabled={selectedCount === 0}
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={onClearSelection}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
