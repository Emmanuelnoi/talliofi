import { useState, useCallback, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { QuickExpenseForm } from './quick-expense-form';
import {
  useKeyboardShortcut,
  formatShortcut,
} from '@/hooks/use-keyboard-shortcut';
import { useIsMobile } from '@/hooks/use-mobile';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/lib/utils';

interface QuickAddFabProps {
  /** Additional class names for the FAB container */
  className?: string;
}

/**
 * Floating Action Button for quick expense entry.
 *
 * Features:
 * - Fixed position at bottom-right
 * - Responsive positioning (above mobile nav on small screens)
 * - Global keyboard shortcut (Cmd+N / Ctrl+N)
 * - Escape key closes the form
 * - Subtle entrance animation
 * - Accessible with proper ARIA labels and focus management
 */
export function QuickAddFab({ className }: QuickAddFabProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const prefersReducedMotion = useReducedMotion();
  const fabRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  // Open with Cmd+N / Ctrl+N
  useKeyboardShortcut({
    key: 'n',
    modifiers: ['meta'],
    onTrigger: useCallback(() => setIsOpen(true), []),
    enabled: !isOpen,
  });

  // Close with Escape
  useKeyboardShortcut({
    key: 'Escape',
    onTrigger: useCallback(() => setIsOpen(false), []),
    enabled: isOpen,
  });

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
  }, []);

  const handleSuccess = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Return focus to FAB when sheet closes
  useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      // Small delay to let sheet animation complete
      const timer = setTimeout(() => {
        fabRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  const shortcutLabel = formatShortcut('N', ['meta']);

  return (
    <>
      {/* FAB Button */}
      <div
        className={cn(
          // Base positioning
          'fixed z-40',
          // Mobile: above bottom nav (h-16 = 64px + 16px padding)
          'bottom-20 right-4',
          // Desktop: lower position
          'md:bottom-6 md:right-6',
          // Entrance animation (disabled if user prefers reduced motion)
          'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300',
          'motion-reduce:animate-none',
          className,
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              ref={fabRef}
              size="icon"
              className={cn(
                // Minimum touch target size: 44x44px (exceeds at 56x56)
                'size-14 rounded-full shadow-lg',
                // Hover/active animations (reduced when motion preference set)
                !prefersReducedMotion && [
                  'hover:shadow-xl hover:scale-105',
                  'active:scale-95',
                  'transition-all duration-200',
                ],
                prefersReducedMotion && 'hover:shadow-xl',
                // Focus ring
                'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2',
              )}
              onClick={() => setIsOpen(true)}
              aria-label={`Add expense (${shortcutLabel})`}
              aria-haspopup="dialog"
              aria-expanded={isOpen}
            >
              <Plus className="size-6" strokeWidth={2.5} aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent
            side={isMobile ? 'left' : 'top'}
            className="flex items-center gap-2"
          >
            <span>Quick add expense</span>
            <kbd className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-xs">
              {shortcutLabel}
            </kbd>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Quick Add Sheet */}
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent
          side={isMobile ? 'bottom' : 'right'}
          className={cn(isMobile && 'h-auto max-h-[90vh] rounded-t-xl')}
        >
          <SheetHeader>
            <SheetTitle>Quick add expense</SheetTitle>
            <SheetDescription>
              Add a new expense quickly. Press Escape to cancel.
            </SheetDescription>
          </SheetHeader>
          <QuickExpenseForm onSuccess={handleSuccess} onCancel={handleCancel} />
        </SheetContent>
      </Sheet>
    </>
  );
}

QuickAddFab.displayName = 'QuickAddFab';
