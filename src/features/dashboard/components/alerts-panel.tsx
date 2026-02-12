import { useMemo } from 'react';
import { CircleAlert, TriangleAlert, Info } from 'lucide-react';
import type { BudgetAlert } from '@/domain/plan';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AlertsPanelProps {
  alerts: readonly BudgetAlert[];
}

const SEVERITY_ORDER: Record<BudgetAlert['severity'], number> = {
  error: 0,
  warning: 1,
  info: 2,
};

const SEVERITY_ICON = {
  error: CircleAlert,
  warning: TriangleAlert,
  info: Info,
} as const;

const SEVERITY_COLOR = {
  error: 'text-deficit',
  warning: 'text-warning',
  info: 'text-neutral',
} as const;

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  const sortedAlerts = useMemo(
    () =>
      [...alerts].sort(
        (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
      ),
    [alerts],
  );

  if (alerts.length === 0) return null;

  return (
    <Card>
      <CardHeader className="space-y-2">
        <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.2em]">
          Attention
        </p>
        <CardTitle className="flex items-center gap-2">
          <TriangleAlert className="text-warning size-5" aria-hidden="true" />
          Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedAlerts.map((alert) => {
          const Icon = SEVERITY_ICON[alert.severity];
          const colorClass = SEVERITY_COLOR[alert.severity];

          return (
            <div
              key={`${alert.code}-${alert.relatedEntityId ?? 'global'}`}
              className="bg-muted/30 flex items-start gap-3 rounded-lg border border-border/60 p-3"
            >
              <Icon
                className={cn('mt-0.5 size-4 shrink-0', colorClass)}
                aria-hidden="true"
              />
              <p className={cn('text-sm', colorClass)}>{alert.message}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
