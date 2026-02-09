import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface GoalProgressProps {
  /** Current amount in cents */
  currentAmountCents: number;
  /** Target amount in cents */
  targetAmountCents: number;
  /** Goal color for the progress bar */
  color: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show percentage text */
  showPercentage?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * A progress bar component for displaying goal progress.
 * Supports different sizes and shows current progress as a percentage.
 */
export function GoalProgress({
  currentAmountCents,
  targetAmountCents,
  color,
  size = 'md',
  showPercentage = false,
  className,
}: GoalProgressProps) {
  const percentage = useMemo(() => {
    if (targetAmountCents <= 0) return 0;
    const raw = (currentAmountCents / targetAmountCents) * 100;
    return Math.min(Math.max(raw, 0), 100);
  }, [currentAmountCents, targetAmountCents]);

  const heightClass = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  }[size];

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'bg-muted w-full overflow-hidden rounded-full',
          heightClass,
        )}
        role="progressbar"
        aria-valuenow={Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${Math.round(percentage)}% progress`}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-500')}
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
      {showPercentage && (
        <span className="text-muted-foreground mt-1 block text-xs tabular-nums">
          {percentage.toFixed(0)}%
        </span>
      )}
    </div>
  );
}
