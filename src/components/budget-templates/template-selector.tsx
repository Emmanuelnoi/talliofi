import { useState, useMemo } from 'react';
import { Search, Sparkles } from 'lucide-react';
import type { BudgetTemplate } from '@/lib/budget-templates';
import { BUDGET_TEMPLATES } from '@/lib/budget-templates';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TemplateCard } from './template-card';

interface TemplateSelectorProps {
  /** Currently selected template ID, or null if starting from scratch */
  selectedTemplateId: string | null;
  /** Callback when a template is selected */
  onSelectTemplate: (template: BudgetTemplate | null) => void;
  /** Whether to show the "Start from scratch" option */
  showScratchOption?: boolean;
  /** Additional templates (e.g., user-created) to include */
  additionalTemplates?: readonly BudgetTemplate[];
}

/**
 * A component for browsing and selecting budget templates.
 * Displays a grid of template cards with optional search filtering.
 */
export function TemplateSelector({
  selectedTemplateId,
  onSelectTemplate,
  showScratchOption = true,
  additionalTemplates = [],
}: TemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const allTemplates = useMemo(
    () => [...BUDGET_TEMPLATES, ...additionalTemplates],
    [additionalTemplates],
  );

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) {
      return allTemplates;
    }
    const query = searchQuery.toLowerCase();
    return allTemplates.filter(
      (template) =>
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.buckets.some((b) => b.name.toLowerCase().includes(query)),
    );
  }, [allTemplates, searchQuery]);

  const handleSelectTemplate = (template: BudgetTemplate) => {
    // Toggle selection if clicking the same template
    if (selectedTemplateId === template.id) {
      onSelectTemplate(null);
    } else {
      onSelectTemplate(template);
    }
  };

  const handleStartFromScratch = () => {
    onSelectTemplate(null);
  };

  return (
    <div className="space-y-4">
      {/* Search - only show if there are many templates */}
      {allTemplates.length > 5 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search templates…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label="Search budget templates"
          />
        </div>
      )}

      {/* Template grid */}
      <div
        className="grid gap-3 sm:grid-cols-2"
        role="radiogroup"
        aria-label="Budget template options"
      >
        {filteredTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            isSelected={selectedTemplateId === template.id}
            onSelect={handleSelectTemplate}
          />
        ))}
      </div>

      {/* No results message */}
      {filteredTemplates.length === 0 && searchQuery && (
        <div className="py-8 text-center text-muted-foreground">
          <p>No templates found matching &ldquo;{searchQuery}&rdquo;</p>
          <Button
            variant="link"
            className="mt-2"
            onClick={() => setSearchQuery('')}
          >
            Clear search
          </Button>
        </div>
      )}

      {/* Start from scratch option */}
      {showScratchOption && (
        <div className="border-t pt-4">
          <Button
            variant={selectedTemplateId === null ? 'default' : 'outline'}
            className="w-full"
            onClick={handleStartFromScratch}
          >
            <Sparkles className="size-4" />
            Start from scratch
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Create your own custom bucket configuration
          </p>
        </div>
      )}
    </div>
  );
}
