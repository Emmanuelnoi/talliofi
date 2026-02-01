import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Variant = 'positive' | 'negative' | 'neutral';

interface KeyNumberCardProps {
  label: string;
  value: string;
  variant?: Variant;
}

const VARIANT_BORDER: Record<Variant, string> = {
  positive: 'border-l-surplus',
  negative: 'border-l-deficit',
  neutral: 'border-l-neutral',
};

const VARIANT_ICON = {
  positive: TrendingUp,
  negative: TrendingDown,
  neutral: Minus,
} as const;

const VARIANT_ICON_COLOR: Record<Variant, string> = {
  positive: 'text-surplus',
  negative: 'text-deficit',
  neutral: 'text-neutral',
};

export function KeyNumberCard({
  label,
  value,
  variant = 'neutral',
}: KeyNumberCardProps) {
  const Icon = VARIANT_ICON[variant];

  return (
    <Card className={cn('border-l-4', VARIANT_BORDER[variant])}>
      <CardContent className="py-4">
        <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <Icon
            className={cn('size-3.5', VARIANT_ICON_COLOR[variant])}
            aria-hidden="true"
          />
          {label}
        </p>
        <p className="money text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
