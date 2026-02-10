import { Check } from 'lucide-react';
import type { BudgetTemplate } from '@/lib/budget-templates';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card';

interface TemplateCardProps {
  /** The budget template to display */
  template: BudgetTemplate;
  /** Whether this template is currently selected */
  isSelected: boolean;
  /** Callback when the card is clicked */
  onSelect: (template: BudgetTemplate) => void;
}

/**
 * Displays a budget template as a selectable card with name, description,
 * and a visual preview of the bucket allocation.
 */
export function TemplateCard({
  template,
  isSelected,
  onSelect,
}: TemplateCardProps) {
  return (
    <Card
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onClick={() => onSelect(template)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(template);
        }
      }}
      className={cn(
        'cursor-pointer transition-all hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isSelected && 'border-primary ring-2 ring-primary/20',
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base">{template.name}</CardTitle>
            <CardDescription className="mt-1 text-sm">
              {template.description}
            </CardDescription>
          </div>
          {isSelected && (
            <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary">
              <Check className="size-3 text-primary-foreground" />
            </div>
          )}
        </div>

        {/* Allocation bar preview */}
        <div className="mt-4 space-y-2">
          <div className="flex h-2 overflow-hidden rounded-full bg-muted">
            {template.buckets.map((bucket, index) => (
              <div
                key={`${template.id}-bucket-${index}`}
                className="transition-all"
                style={{
                  width: `${bucket.targetPercentage}%`,
                  backgroundColor: bucket.color,
                }}
                title={`${bucket.name}: ${bucket.targetPercentage}%`}
              />
            ))}
          </div>

          {/* Bucket labels */}
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {template.buckets.map((bucket, index) => (
              <div
                key={`${template.id}-label-${index}`}
                className="flex items-center gap-1 text-xs text-muted-foreground"
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: bucket.color }}
                  aria-hidden="true"
                />
                <span>
                  {bucket.name} ({bucket.targetPercentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
