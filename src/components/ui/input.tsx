import * as React from 'react';

import { cn } from '@/lib/utils';

function Input({
  className,
  type,
  name,
  autoComplete,
  ...props
}: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'file:text-foreground placeholder:text-muted-foreground/70 selection:bg-foreground selection:text-background bg-background border-border/70 flex h-10 w-full min-w-0 rounded-lg border px-3 text-sm shadow-sm transition-colors outline-none file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:opacity-50',
        'focus-visible:border-foreground/30 focus-visible:ring-2 focus-visible:ring-foreground/10',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        className,
      )}
      name={name ?? props.id}
      autoComplete={autoComplete ?? 'off'}
      {...props}
    />
  );
}

export { Input };
