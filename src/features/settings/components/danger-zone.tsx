import { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { clearAllData } from '@/data/db';
import { useEncryptionStore } from '@/stores/encryption-store';

export function DangerZone() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setEncryptionEnabled = useEncryptionStore((s) => s.setEnabled);
  const setEncryptionUnlocked = useEncryptionStore((s) => s.setUnlocked);
  const [isClearing, setIsClearing] = useState(false);

  async function handleClearAllData() {
    setIsClearing(true);
    try {
      await clearAllData();
      setEncryptionEnabled(false);
      setEncryptionUnlocked(false);
      queryClient.clear();
      await queryClient.invalidateQueries();
      toast.success('All data has been cleared.');
      navigate('/onboarding', { replace: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to clear data.';
      toast.error(message);
      setIsClearing(false);
    }
  }

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-destructive">Danger Zone</CardTitle>
        <CardDescription>
          Irreversible actions that will permanently affect your data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isClearing}>
              {isClearing ? (
                <Loader2 className="size-4 motion-safe:animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              {isClearing ? 'Deleting…' : 'Delete All Data'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all your plans, expenses, buckets,
                and history. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isClearing}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleClearAllData}
                disabled={isClearing}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {isClearing ? 'Deleting…' : 'Delete Everything'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
