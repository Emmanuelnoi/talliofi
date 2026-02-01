import * as React from 'react';
import { cn } from '@/lib/utils';

interface PercentInputProps extends Omit<
  React.ComponentProps<'input'>,
  'value' | 'onChange' | 'type'
> {
  /** Current value as a percentage 0-100 */
  value: number | undefined;
  /** Called with the new percentage value */
  onChange: (value: number) => void;
  /** Minimum percentage (default 0) */
  min?: number;
  /** Maximum percentage (default 100) */
  max?: number;
}

/**
 * Percentage input with a `%` suffix. Stores values as 0-100.
 *
 * Formats on blur (e.g. `25.5`). Compatible with React Hook Form
 * via `Controller` or value/onChange.
 */
const PercentInput = React.forwardRef<HTMLInputElement, PercentInputProps>(
  function PercentInput(
    {
      value,
      onChange,
      min = 0,
      max = 100,
      className,
      onBlur,
      onFocus,
      ...props
    },
    ref,
  ) {
    const [displayValue, setDisplayValue] = React.useState<string>(
      formatPercent(value),
    );
    const [isFocused, setIsFocused] = React.useState(false);

    React.useEffect(() => {
      if (!isFocused) {
        setDisplayValue(formatPercent(value));
      }
    }, [value, isFocused]);

    function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
      setIsFocused(true);
      setDisplayValue(
        value != null && !Number.isNaN(value) ? String(value) : '',
      );
      onFocus?.(e);
    }

    function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
      setIsFocused(false);
      const parsed = parseFloat(displayValue);
      if (!Number.isNaN(parsed)) {
        const clamped = clamp(parsed, min, max);
        onChange(clamped);
        setDisplayValue(formatPercent(clamped));
      } else {
        setDisplayValue(formatPercent(value));
      }
      onBlur?.(e);
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value;
      if (raw === '' || /^\d*\.?\d{0,2}$/.test(raw)) {
        setDisplayValue(raw);
        const parsed = parseFloat(raw);
        if (!Number.isNaN(parsed)) {
          onChange(clamp(parsed, min, max));
        }
      }
    }

    return (
      <div className="relative">
        <input
          ref={ref}
          type="text"
          inputMode="decimal"
          data-slot="input"
          className={cn(
            'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent py-1 pr-8 pl-3 text-base tabular-nums shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:opacity-50 md:text-sm',
            'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
            'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
            className,
          )}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
          %
        </span>
      </div>
    );
  },
);

PercentInput.displayName = 'PercentInput';

function formatPercent(value: number | undefined): string {
  if (value == null || Number.isNaN(value)) return '';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export { PercentInput };
