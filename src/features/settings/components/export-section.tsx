import { useState } from 'react';
import {
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Loader2,
} from 'lucide-react';
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
import {
  exportData,
  downloadAsFile,
  exportAsCSV,
  downloadAsCSV,
  exportAsPDF,
  downloadAsPDF,
} from '@/data/export/export-service';

type ExportFormat = 'json' | 'csv' | 'pdf';

export function ExportSection() {
  const { data: plan } = useActivePlan();
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(
    null,
  );

  async function handleExport(format: ExportFormat) {
    if (!plan) {
      toast.error('No plan found. Complete onboarding first.');
      return;
    }

    setExportingFormat(format);
    const timestamp = new Date().toISOString().slice(0, 10);

    try {
      switch (format) {
        case 'json': {
          const json = await exportData(plan.id);
          const filename = `talliofi-export-${timestamp}.json`;
          downloadAsFile(json, filename);
          toast.success(`Data exported as ${filename}`);
          break;
        }
        case 'csv': {
          const csv = await exportAsCSV(plan.id);
          const filename = `talliofi-export-${timestamp}.csv`;
          downloadAsCSV(csv, filename);
          toast.success(`Data exported as ${filename}`);
          break;
        }
        case 'pdf': {
          const blob = await exportAsPDF(plan.id);
          const filename = `talliofi-report-${timestamp}.pdf`;
          downloadAsPDF(blob, filename);
          toast.success(`Report exported as ${filename}`);
          break;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed.';
      toast.error(message);
    } finally {
      setExportingFormat(null);
    }
  }

  const isExporting = exportingFormat !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export Data</CardTitle>
        <CardDescription>
          Download your financial data in different formats. JSON can be
          re-imported later; CSV and PDF are for viewing and sharing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => handleExport('json')}
            disabled={isExporting || !plan}
            aria-label="Download financial data as JSON"
          >
            {exportingFormat === 'json' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileJson className="size-4" />
            )}
            JSON
          </Button>

          <Button
            variant="outline"
            onClick={() => handleExport('csv')}
            disabled={isExporting || !plan}
            aria-label="Download financial data as CSV"
          >
            {exportingFormat === 'csv' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="size-4" />
            )}
            CSV
          </Button>

          <Button
            variant="outline"
            onClick={() => handleExport('pdf')}
            disabled={isExporting || !plan}
            aria-label="Download financial report as PDF"
          >
            {exportingFormat === 'pdf' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileText className="size-4" />
            )}
            PDF
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          <Download className="inline size-3 mr-1" />
          Only JSON exports can be imported back into Talliofi.
        </p>
      </CardContent>
    </Card>
  );
}
