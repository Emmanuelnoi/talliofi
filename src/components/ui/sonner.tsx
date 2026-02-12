import { Toaster as Sonner } from 'sonner';

/**
 * Toast notification container with ARIA live region support.
 *
 * Sonner automatically manages ARIA live regions for announcements.
 * We configure it with appropriate styling and accessibility settings.
 */
function Toaster({ ...props }: React.ComponentProps<typeof Sonner>) {
  return (
    <Sonner
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      // Sonner uses role="status" and aria-live="polite" by default
      // For error toasts, it uses role="alert" automatically
      toastOptions={{
        // Ensure toast content is accessible
        classNames: {
          toast:
            'group toast rounded-lg border border-border/60 bg-card text-foreground shadow-lg',
          title: 'text-sm font-semibold tracking-tight',
          description: 'text-xs text-muted-foreground',
          actionButton: 'bg-foreground text-background hover:bg-foreground/90',
          cancelButton: 'bg-muted text-foreground',
        },
      }}
      // Close button is accessible by default with proper aria-label
      closeButton
      {...props}
    />
  );
}

export { Toaster };
