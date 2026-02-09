import { Copy, MoreVertical, Pencil, Trash2, Check } from 'lucide-react';
import type { Plan } from '@/domain/plan/types';
import { formatMoney, type Cents } from '@/domain/money';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface PlanCardProps {
  plan: Plan;
  isActive: boolean;
  onSelect: (plan: Plan) => void;
  onEdit: (plan: Plan) => void;
  onDuplicate: (plan: Plan) => void;
  onDelete: (plan: Plan) => void;
}

/**
 * Card displaying a plan with actions menu.
 */
export function PlanCard({
  plan,
  isActive,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
}: PlanCardProps) {
  const createdDate = new Date(plan.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Card
      className={cn(
        'relative cursor-pointer transition-colors hover:border-primary/50',
        isActive && 'border-primary ring-primary/20 ring-2',
      )}
      onClick={() => onSelect(plan)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(plan);
        }
      }}
      aria-selected={isActive}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{plan.name}</CardTitle>
            {isActive && (
              <Badge variant="secondary" className="gap-1">
                <Check className="size-3" />
                Active
              </Badge>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={`Actions for ${plan.name}`}
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(plan);
                }}
              >
                <Pencil className="mr-2 size-4" />
                Edit Name
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(plan);
                }}
              >
                <Copy className="mr-2 size-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(plan);
                }}
              >
                <Trash2 className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-muted-foreground space-y-1 text-sm">
          <p>
            <span className="font-medium">Income:</span>{' '}
            {formatMoney(plan.grossIncomeCents as Cents)} / {plan.incomeFrequency}
          </p>
          <p>
            <span className="font-medium">Created:</span> {createdDate}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
