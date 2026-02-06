import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useActivePlan } from '@/hooks/use-active-plan';
import { exportData, downloadAsFile } from '@/data/export/export-service';

export function ExportSection() {
  const { data: plan } = useActivePlan();
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    if (!plan) {
      toast.error('No plan found. Complete onboarding first.');
      return;
    }

    setIsExporting(true);
    try {
      const json = await exportData(plan.id);
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `talliofi-export-${timestamp}.json`;
      downloadAsFile(json, filename);
      toast.success(`Data exported as ${filename}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed.';
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export Data</CardTitle>
        <CardDescription>
          Download all your financial data as a JSON file. Keep this file safe —
          it contains sensitive information.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleExport}
          disabled={isExporting || !plan}
          aria-label="Download financial data as JSON"
        >
          {isExporting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          {isExporting ? 'Exporting...' : 'Download as JSON'}
        </Button>
      </CardContent>
    </Card>
  );
}
