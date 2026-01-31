import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type SaveStatus = 'idle' | 'saving' | 'saved';

interface SaveIndicatorProps {
  status: SaveStatus;
  className?: string;
}

/**
 * Displays a save status indicator.
 * - "saving": spinning loader
 * - "saved": checkmark (parent should transition to idle after a delay)
 * - "idle": hidden
 *
 * The parent component is responsible for managing the status lifecycle
 * (e.g., transitioning from "saved" to "idle" after a timeout).
 */
export function SaveIndicator({ status, className }: SaveIndicatorProps) {
  if (status === 'idle') {
    return null;
  }

  return (
    <div
      className={cn(
        'text-muted-foreground flex items-center gap-1.5 text-xs',
        status === 'saved' && 'animate-in fade-in duration-300',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      {status === 'saving' && (
        <>
          <Loader2 className="size-3 animate-spin" />
          <span>Saving...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className="size-3" />
          <span>Saved</span>
        </>
      )}
    </div>
  );
}
