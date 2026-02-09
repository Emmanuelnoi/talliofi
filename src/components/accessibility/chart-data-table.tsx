import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { TableIcon, BarChart3 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ChartDataItem {
  label: string;
  value: string;
  secondaryValue?: string;
}

interface ChartDataTableProps {
  /** Title for the data table (used in caption) */
  title: string;
  /** Column header for labels */
  labelHeader?: string;
  /** Column header for primary values */
  valueHeader?: string;
  /** Column header for secondary values (optional) */
  secondaryValueHeader?: string;
  /** The data to display */
  data: ChartDataItem[];
  /** Additional class name */
  className?: string;
}

/**
 * Accessible data table alternative for charts.
 *
 * Provides a tabular representation of chart data for screen reader users
 * and users who prefer data tables over visual charts.
 *
 * Can be toggled between chart and table views.
 *
 * WCAG 2.1 Success Criterion 1.1.1 (Non-text Content - Level A)
 *
 * @example
 * ```tsx
 * <ChartDataTable
 *   title="Monthly Expenses"
 *   labelHeader="Month"
 *   valueHeader="Amount"
 *   data={[
 *     { label: 'January', value: '$2,000' },
 *     { label: 'February', value: '$1,800' },
 *   ]}
 * />
 * ```
 */
export function ChartDataTable({
  title,
  labelHeader = 'Category',
  valueHeader = 'Value',
  secondaryValueHeader,
  data,
  className,
}: ChartDataTableProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (data.length === 0) {
    return null;
  }

  const hasSecondaryValues = data.some((item) => item.secondaryValue);

  return (
    <div className={cn('mt-4', className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls={`chart-data-table-${title.replace(/\s+/g, '-').toLowerCase()}`}
        className="text-muted-foreground gap-1.5 text-xs"
      >
        {isExpanded ? (
          <>
            <BarChart3 className="size-3.5" aria-hidden="true" />
            Hide data table
          </>
        ) : (
          <>
            <TableIcon className="size-3.5" aria-hidden="true" />
            Show data table
          </>
        )}
      </Button>

      {isExpanded && (
        <div
          id={`chart-data-table-${title.replace(/\s+/g, '-').toLowerCase()}`}
          className="mt-2 overflow-hidden rounded-md border"
        >
          <Table>
            <caption className="sr-only">{title}</caption>
            <TableHeader>
              <TableRow>
                <TableHead>{labelHeader}</TableHead>
                <TableHead className="text-right">{valueHeader}</TableHead>
                {hasSecondaryValues && secondaryValueHeader && (
                  <TableHead className="text-right">
                    {secondaryValueHeader}
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.label}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.value}
                  </TableCell>
                  {hasSecondaryValues && (
                    <TableCell className="text-muted-foreground text-right tabular-nums">
                      {item.secondaryValue ?? '-'}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

ChartDataTable.displayName = 'ChartDataTable';
