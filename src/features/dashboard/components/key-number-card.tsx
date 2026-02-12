import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Variant = 'positive' | 'negative' | 'neutral';

interface KeyNumberCardProps {
  label: string;
  value: string;
  variant?: Variant;
}

const VARIANT_ICON = {
  positive: TrendingUp,
  negative: TrendingDown,
  neutral: Minus,
} as const;

const VARIANT_BAR: Record<Variant, string> = {
  positive: 'before:bg-surplus/70',
  negative: 'before:bg-deficit/70',
  neutral: 'before:bg-border',
};

const VARIANT_ICON_COLOR: Record<Variant, string> = {
  positive: 'text-surplus',
  negative: 'text-deficit',
  neutral: 'text-muted-foreground',
};

export function KeyNumberCard({
  label,
  value,
  variant = 'neutral',
}: KeyNumberCardProps) {
  const Icon = VARIANT_ICON[variant];

  return (
    <Card
      className={cn(
        'relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-0.5',
        VARIANT_BAR[variant],
      )}
    >
      <CardContent className="space-y-2 py-5">
        <div className="text-muted-foreground flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em]">
          <span>{label}</span>
          <Icon
            className={cn('size-4', VARIANT_ICON_COLOR[variant])}
            aria-hidden="true"
          />
        </div>
        <p className="money text-2xl font-semibold tracking-tight sm:text-3xl">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
