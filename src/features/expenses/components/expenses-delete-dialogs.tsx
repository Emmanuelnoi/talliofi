import type { ExpenseItem } from '@/domain/plan';
import { Loader2 } from 'lucide-react';
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

interface ExpensesBulkDeleteDialogProps {
  open: boolean;
  selectedCount: number;
  attachmentCount: number;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ExpensesBulkDeleteDialog({
  open,
  selectedCount,
  attachmentCount,
  isDeleting,
  onOpenChange,
  onConfirm,
}: ExpensesBulkDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete selected expenses?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              <p>
                This will permanently delete {selectedCount} expense
                {selectedCount !== 1 && 's'}. This action cannot be undone.
              </p>
              {attachmentCount > 0 && (
                <p className="text-destructive mt-2 font-medium">
                  {attachmentCount} attached file
                  {attachmentCount !== 1 && 's'} will also be permanently
                  deleted.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-white hover:bg-destructive/90"
            disabled={isDeleting}
          >
            {isDeleting && (
              <Loader2 className="size-4 motion-safe:animate-spin" />
            )}
            Delete selected
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface ExpenseDeleteDialogProps {
  expense: ExpenseItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ExpenseDeleteDialog({
  expense,
  open,
  onOpenChange,
  onConfirm,
}: ExpenseDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete expense?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete &ldquo;{expense?.name}&rdquo; from your
            budget.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
