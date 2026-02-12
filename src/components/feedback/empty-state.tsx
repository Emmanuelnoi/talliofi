import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: EmptyStateAction;
  eyebrow?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  eyebrow,
}: EmptyStateProps) {
  return (
    <div className="border-border/60 bg-card/50 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-8 py-12 text-center">
      <div className="bg-muted/70 flex size-12 items-center justify-center rounded-2xl">
        <Icon className="text-muted-foreground size-6" aria-hidden="true" />
      </div>
      <div className="space-y-2">
        {eyebrow && (
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.2em]">
            {eyebrow}
          </p>
        )}
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      </div>
      <p className="text-muted-foreground max-w-sm text-sm leading-6">
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  );
}
