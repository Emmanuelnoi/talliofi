import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import {
  CalendarDays,
  MoreHorizontal,
  Pencil,
  Play,
  Trash2,
} from 'lucide-react';
import { formatMoney } from '@/domain/money';
import { normalizeToMonthly } from '@/domain/plan';
import type { RecurringTemplate, BucketAllocation } from '@/domain/plan';
import { recurringService } from '@/services/recurring-service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { FREQUENCY_LABELS, CATEGORY_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface TemplateCardProps {
  /** The recurring template to display */
  template: RecurringTemplate;
  /** The bucket this template belongs to */
  bucket: BucketAllocation | undefined;
  /** Callback when edit is clicked */
  onEdit: () => void;
  /** Callback when delete is clicked */
  onDelete: () => void;
  /** Callback when active status is toggled */
  onToggleActive: () => void;
  /** Callback when generate now is clicked */
  onGenerateNow: () => void;
  /** Whether actions are disabled (e.g., during mutation) */
  isLoading?: boolean;
}

/**
 * Card component for displaying a recurring template with actions.
 *
 * Features:
 * - Active/inactive toggle
 * - Next generation date display
 * - Frequency badge
 * - Quick actions (edit, delete, generate now)
 */
export function TemplateCard({
  template,
  bucket,
  onEdit,
  onDelete,
  onToggleActive,
  onGenerateNow,
  isLoading = false,
}: TemplateCardProps) {
  const monthlyAmount = useMemo(
    () => normalizeToMonthly(template.amountCents, template.frequency),
    [template.amountCents, template.frequency],
  );

  const nextGenerationDate = useMemo(
    () => recurringService.getNextGenerationDate(template),
    [template],
  );

  const showNormalized = template.frequency !== 'monthly';

  return (
    <Card className={cn(!template.isActive && 'opacity-60')}>
      <CardContent className="flex items-center gap-4 py-4">
        {/* Color swatch */}
        {bucket && (
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: bucket.color }}
            aria-hidden="true"
          />
        )}

        {/* Name + meta */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{template.name}</span>
            <Badge variant="secondary" className="shrink-0">
              {FREQUENCY_LABELS[template.frequency]}
            </Badge>
            {template.isFixed && (
              <Badge variant="outline" className="shrink-0">
                Fixed
              </Badge>
            )}
            {!template.isActive && (
              <Badge variant="outline" className="shrink-0 text-muted-foreground">
                Paused
              </Badge>
            )}
          </div>
          <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
            <span>{CATEGORY_LABELS[template.category]}</span>
            {bucket && (
              <>
                <span aria-hidden="true">&middot;</span>
                <span>{bucket.name}</span>
              </>
            )}
            {template.dayOfMonth && (
              <>
                <span aria-hidden="true">&middot;</span>
                <span>Day {template.dayOfMonth}</span>
              </>
            )}
          </div>
        </div>

        {/* Amount */}
        <div className="shrink-0 text-right">
          <div className="font-medium tabular-nums">
            {formatMoney(template.amountCents)}
            {showNormalized && (
              <span className="text-muted-foreground text-xs">
                /
                {template.frequency === 'weekly'
                  ? 'wk'
                  : template.frequency === 'biweekly'
                    ? '2wk'
                    : template.frequency === 'quarterly'
                      ? 'qtr'
                      : template.frequency === 'annual'
                        ? 'yr'
                        : template.frequency === 'semimonthly'
                          ? '2mo'
                          : 'mo'}
              </span>
            )}
          </div>
          {showNormalized && (
            <div className="text-muted-foreground text-xs tabular-nums">
              {formatMoney(monthlyAmount)}/mo
            </div>
          )}
        </div>

        {/* Next generation date */}
        {template.isActive && nextGenerationDate && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-muted-foreground hidden items-center gap-1 text-xs sm:flex">
                <CalendarDays className="size-3" />
                <span>{format(parseISO(nextGenerationDate), 'MMM d')}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Next generation: {format(parseISO(nextGenerationDate), 'MMMM d, yyyy')}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Active toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Switch
                checked={template.isActive}
                onCheckedChange={onToggleActive}
                disabled={isLoading}
                aria-label={template.isActive ? 'Pause template' : 'Activate template'}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{template.isActive ? 'Pause auto-generation' : 'Enable auto-generation'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              aria-label={`Actions for ${template.name}`}
              disabled={isLoading}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onGenerateNow}>
              <Play className="size-4" />
              Generate now
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
}

