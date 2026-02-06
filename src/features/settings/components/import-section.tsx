import { useRef, useState } from 'react';
import { Upload, Loader2, AlertTriangle } from 'lucide-react';
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
} from '@/components/ui/alert-dialog';
import {
  parseAndValidateImport,
  importData,
} from '@/data/export/import-service';
import type { ExportPayload } from '@/data/export/import-service';

interface ImportPreview {
  planName: string;
  bucketCount: number;
  expenseCount: number;
  snapshotCount: number;
  taxComponentCount: number;
}

function buildPreview(payload: ExportPayload): ImportPreview {
  return {
    planName: payload.plan.name,
    bucketCount: payload.buckets.length,
    expenseCount: payload.expenses.length,
    snapshotCount: payload.snapshots.length,
    taxComponentCount: payload.taxComponents.length,
  };
}

export function ImportSection() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pendingPayload, setPendingPayload] = useState<ExportPayload | null>(
    null,
  );
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  function resetState() {
    setPendingPayload(null);
    setPreview(null);
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
    if (file.size > MAX_FILE_SIZE) {
      setValidationError('File too large. Maximum size is 50 MB.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setValidationError(null);
    setPreview(null);
    setPendingPayload(null);

    try {
      const text = await file.text();
      const payload = parseAndValidateImport(text);
      setPendingPayload(payload);
      setPreview(buildPreview(payload));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to read file.';
      setValidationError(message);
    }
  }

  async function handleConfirmImport() {
    if (!pendingPayload) return;

    setIsImporting(true);
    try {
      await importData(pendingPayload);
      await queryClient.invalidateQueries();
      toast.success('Data imported successfully.');
      resetState();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed.';
      toast.error(message);
    } finally {
      setIsImporting(false);
      setIsDialogOpen(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Data</CardTitle>
        <CardDescription>
          Import financial data from a previously exported JSON file.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80"
            aria-label="Select JSON file to import"
          />
        </div>

        {validationError && (
          <div
            className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>{validationError}</p>
          </div>
        )}

        {preview && (
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/50 p-3">
              <p className="mb-2 text-sm font-medium">Import preview</p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <dt className="text-muted-foreground">Plan</dt>
                <dd>{preview.planName}</dd>
                <dt className="text-muted-foreground">Buckets</dt>
                <dd>{preview.bucketCount}</dd>
                <dt className="text-muted-foreground">Expenses</dt>
                <dd>{preview.expenseCount}</dd>
                <dt className="text-muted-foreground">Tax components</dt>
                <dd>{preview.taxComponentCount}</dd>
                <dt className="text-muted-foreground">Snapshots</dt>
                <dd>{preview.snapshotCount}</dd>
              </dl>
            </div>

            <Button
              onClick={() => setIsDialogOpen(true)}
              disabled={isImporting}
            >
              {isImporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {isImporting ? 'Importing...' : 'Import Data'}
            </Button>
          </div>
        )}

        <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Import</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all your current data and replace
                it with the imported data. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isImporting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmImport}
                disabled={isImporting}
              >
                {isImporting ? 'Importing...' : 'Continue'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
