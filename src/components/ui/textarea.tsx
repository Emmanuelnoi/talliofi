import * as React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'>
>(({ className, name, autoComplete, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        'border-border/70 bg-background placeholder:text-muted-foreground/70 focus-visible:ring-foreground/10 flex min-h-[80px] w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      name={name ?? props.id}
      autoComplete={autoComplete ?? 'off'}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
