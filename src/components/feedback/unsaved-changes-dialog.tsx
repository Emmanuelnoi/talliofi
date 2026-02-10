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

interface UnsavedChangesDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when the user chooses to stay on the current page */
  onStay: () => void;
  /** Called when the user confirms they want to leave */
  onLeave: () => void;
}

/**
 * Alert dialog that warns users about unsaved changes when navigating away.
 *
 * Intended to be used alongside the `useUnsavedChanges` hook:
 *
 * @example
 * ```tsx
 * const { blocker, confirmNavigation, cancelNavigation } = useUnsavedChanges({
 *   isDirty: formState.isDirty,
 * });
 *
 * <UnsavedChangesDialog
 *   open={blocker.state === 'blocked'}
 *   onStay={cancelNavigation}
 *   onLeave={confirmNavigation}
 * />
 * ```
 */
export function UnsavedChangesDialog({
  open,
  onStay,
  onLeave,
}: UnsavedChangesDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onStay()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes. Are you sure you want to leave? Your
            changes will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onStay}>Stay</AlertDialogCancel>
          <AlertDialogAction onClick={onLeave}>Leave</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
