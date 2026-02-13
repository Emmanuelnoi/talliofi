import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FilterChipProps {
  label: string;
  onClear: () => void;
}

export function FilterChip({ label, onClear }: FilterChipProps) {
  return (
    <Badge variant="secondary" className="gap-1 pr-1">
      <span className="max-w-[200px] truncate">{label}</span>
      <button
        type="button"
        onClick={onClear}
        className="hover:bg-muted rounded-sm p-0.5"
        aria-label={`Remove filter: ${label}`}
      >
        <X className="size-3" />
      </button>
    </Badge>
  );
}
