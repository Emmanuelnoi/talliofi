import { useMemo } from 'react';
import { MoreHorizontal, Pencil, Trash2, Target, Check } from 'lucide-react';
import type { Goal } from '@/domain/plan';
import { formatMoney, cents } from '@/domain/money';
import { useCurrencyStore } from '@/stores/currency-store';
import {
  formatMonthYear,
  formatDisplayDate,
} from '@/features/expenses/utils/date-utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GoalProgress } from './goal-progress';
import { GOAL_TYPE_LABELS } from '@/lib/constants';

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
  onComplete: (goal: Goal) => void;
}

/**
 * Calculates the projected completion date based on monthly contribution rate.
 * Returns null if goal is already completed or no progress has been made.
 */
function calculateProjectedCompletion(
  currentAmountCents: number,
  targetAmountCents: number,
  createdAt: string,
): Date | null {
  if (currentAmountCents >= targetAmountCents) return null;
  if (currentAmountCents <= 0) return null;

  const created = new Date(createdAt);
  const now = new Date();
  const monthsElapsed = Math.max(
    1,
    (now.getFullYear() - created.getFullYear()) * 12 +
      (now.getMonth() - created.getMonth()),
  );

  const monthlyRate = currentAmountCents / monthsElapsed;
  if (monthlyRate <= 0) return null;

  const remaining = targetAmountCents - currentAmountCents;
  const monthsToComplete = Math.ceil(remaining / monthlyRate);

  const projected = new Date();
  projected.setMonth(projected.getMonth() + monthsToComplete);
  return projected;
}

/**
 * Formats a date in a user-friendly way (e.g., "Mar 2026").
 */
function formatProjectedDate(date: Date): string {
  return formatMonthYear(date);
}

/**
 * Checks if the goal should trigger a celebration animation.
 * A goal is considered newly completed if it was completed within the last 24 hours.
 */
function isNewlyCompleted(goal: Goal): boolean {
  if (!goal.isCompleted) return false;
  const updatedAt = new Date(goal.updatedAt);
  const dayAgo = new Date();
  dayAgo.setDate(dayAgo.getDate() - 1);
  return updatedAt > dayAgo;
}

export function GoalCard({
  goal,
  onEdit,
  onDelete,
  onComplete,
}: GoalCardProps) {
  const currencyCode = useCurrencyStore((s) => s.currencyCode);
  const percentage = useMemo(() => {
    if (goal.targetAmountCents <= 0) return 0;
    return Math.min(
      100,
      (goal.currentAmountCents / goal.targetAmountCents) * 100,
    );
  }, [goal.currentAmountCents, goal.targetAmountCents]);

  const projectedDate = useMemo(() => {
    if (goal.isCompleted) return null;
    return calculateProjectedCompletion(
      goal.currentAmountCents,
      goal.targetAmountCents,
      goal.createdAt,
    );
  }, [goal]);

  const remainingAmount = useMemo(() => {
    return Math.max(0, goal.targetAmountCents - goal.currentAmountCents);
  }, [goal.currentAmountCents, goal.targetAmountCents]);

  const isComplete = goal.isCompleted || percentage >= 100;
  const showCelebration = isNewlyCompleted(goal);

  return (
    <Card
      className={
        showCelebration
          ? 'animate-pulse border-2 border-green-500 bg-green-50 dark:bg-green-950/20'
          : ''
      }
    >
      <CardContent className="py-4">
        <div className="flex items-start gap-4">
          {/* Color indicator */}
          <div
            className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: `${goal.color}20` }}
          >
            {isComplete ? (
              <Check className="size-4" style={{ color: goal.color }} />
            ) : (
              <Target className="size-4" style={{ color: goal.color }} />
            )}
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-medium">{goal.name}</h3>
              <Badge
                variant={goal.type === 'savings' ? 'secondary' : 'outline'}
                className="shrink-0"
              >
                {GOAL_TYPE_LABELS[goal.type]}
              </Badge>
              {isComplete && (
                <Badge className="shrink-0 bg-green-600 text-white">
                  Completed
                </Badge>
              )}
            </div>

            {/* Progress bar */}
            <div className="mt-3">
              <GoalProgress
                currentAmountCents={goal.currentAmountCents}
                targetAmountCents={goal.targetAmountCents}
                color={goal.color}
                size="md"
              />
            </div>

            {/* Amount details */}
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-medium tabular-nums">
                {formatMoney(cents(goal.currentAmountCents), {
                  currency: currencyCode,
                })}
              </span>
              <span className="text-muted-foreground text-sm">
                of{' '}
                {formatMoney(cents(goal.targetAmountCents), {
                  currency: currencyCode,
                })}
              </span>
              <span className="text-muted-foreground ml-auto text-sm tabular-nums">
                {percentage.toFixed(0)}%
              </span>
            </div>

            {/* Additional info */}
            <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              {!isComplete && remainingAmount > 0 && (
                <span>
                  {formatMoney(cents(remainingAmount), {
                    currency: currencyCode,
                  })}{' '}
                  remaining
                </span>
              )}
              {goal.targetDate && (
                <>
                  <span aria-hidden="true">&middot;</span>
                  <span>Target: {formatDisplayDate(goal.targetDate!)}</span>
                </>
              )}
              {projectedDate && !goal.targetDate && (
                <>
                  <span aria-hidden="true">&middot;</span>
                  <span>
                    Est. completion: {formatProjectedDate(projectedDate)}
                  </span>
                </>
              )}
              {goal.notes && (
                <>
                  <span aria-hidden="true">&middot;</span>
                  <span className="truncate">{goal.notes}</span>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                aria-label={`Actions for ${goal.name}`}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!goal.isCompleted && percentage >= 100 && (
                <DropdownMenuItem onClick={() => onComplete(goal)}>
                  <Check className="size-4" />
                  Mark as completed
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onEdit(goal)}>
                <Pencil className="size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(goal)}
              >
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
