import { useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import type { RecurringTemplate, BucketAllocation } from '@/domain/plan';
import { EmptyState } from '@/components/feedback/empty-state';
import { TemplateCard } from './template-card';

interface TemplateListProps {
  /** List of recurring templates to display */
  templates: RecurringTemplate[];
  /** Map of bucket IDs to bucket objects */
  bucketMap: Map<string, BucketAllocation>;
  /** Called when a template edit is requested */
  onEdit: (template: RecurringTemplate) => void;
  /** Called when a template delete is requested */
  onDelete: (template: RecurringTemplate) => void;
  /** Called when a template active status is toggled */
  onToggleActive: (template: RecurringTemplate) => void;
  /** Called when generate now is requested for a template */
  onGenerateNow: (template: RecurringTemplate) => void;
  /** Called when create new is requested (for empty state) */
  onCreateNew: () => void;
  /** Whether any mutation is in progress */
  isLoading?: boolean;
}

/**
 * List component for displaying recurring templates.
 *
 * Features:
 * - Sorted list with active templates first
 * - Empty state with create action
 * - Cards with full template management actions
 */
export function TemplateList({
  templates,
  bucketMap,
  onEdit,
  onDelete,
  onToggleActive,
  onGenerateNow,
  onCreateNew,
  isLoading = false,
}: TemplateListProps) {
  // Sort templates: active first, then by name
  const sortedTemplates = useMemo(() => {
    return [...templates].sort((a, b) => {
      // Active templates first
      if (a.isActive !== b.isActive) {
        return a.isActive ? -1 : 1;
      }
      // Then by name
      return a.name.localeCompare(b.name);
    });
  }, [templates]);

  if (templates.length === 0) {
    return (
      <EmptyState
        icon={RefreshCw}
        title="No recurring templates"
        description="Create templates to automatically generate expenses on a schedule."
        action={{
          label: 'Create template',
          onClick: onCreateNew,
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      {sortedTemplates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          bucket={bucketMap.get(template.bucketId)}
          onEdit={() => onEdit(template)}
          onDelete={() => onDelete(template)}
          onToggleActive={() => onToggleActive(template)}
          onGenerateNow={() => onGenerateNow(template)}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
}
