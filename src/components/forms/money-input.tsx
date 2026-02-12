import * as React from 'react';
import { cn } from '@/lib/utils';
import { useCurrencyStore } from '@/stores/currency-store';
import { getCurrencySymbol, type CurrencyCode } from '@/domain/money';

interface MoneyInputProps extends Omit<
  React.ComponentProps<'input'>,
  'value' | 'onChange' | 'type'
> {
  /** Current value in dollars (not cents) */
  value: number | undefined;
  /** Called with the new dollar value on change */
  onChange: (value: number) => void;
  /** Minimum dollar value allowed */
  min?: number;
  /** Maximum dollar value allowed */
  max?: number;
  /** Override currency code for the prefix symbol */
  currencyCode?: CurrencyCode;
}

/**
 * Currency input that displays a `$` prefix and formats on blur.
 *
 * Accepts / emits dollar values (number). The parent is responsible for
 * converting to/from cents when persisting.
 *
 * Compatible with React Hook Form via `Controller` or `forwardRef` + value/onChange.
 */
const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  function MoneyInput(
    {
      value,
      onChange,
      min,
      max,
      className,
      onBlur,
      onFocus,
      currencyCode,
      name,
      autoComplete,
      ...props
    },
    ref,
  ) {
    const [displayValue, setDisplayValue] = React.useState<string>(
      formatDollars(value),
    );
    const [isFocused, setIsFocused] = React.useState(false);
    const defaultCurrency = useCurrencyStore((s) => s.currencyCode);
    const symbol = getCurrencySymbol(currencyCode ?? defaultCurrency);

    // Sync from external value changes when not focused
    React.useEffect(() => {
      if (!isFocused) {
        setDisplayValue(formatDollars(value));
      }
    }, [value, isFocused]);

    function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
      setIsFocused(true);
      // Show raw number while editing
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
        setDisplayValue(formatDollars(clamped));
      } else {
        setDisplayValue(formatDollars(value));
      }
      onBlur?.(e);
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value;
      // Allow digits, single decimal, and leading minus
      if (raw === '' || /^-?\d*\.?\d{0,2}$/.test(raw)) {
        setDisplayValue(raw);
        const parsed = parseFloat(raw);
        if (!Number.isNaN(parsed)) {
          onChange(clamp(parsed, min, max));
        }
      }
    }

    return (
      <div className="relative">
        <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
          {symbol}
        </span>
        <input
          ref={ref}
          type="text"
          inputMode="decimal"
          data-slot="input"
          className={cn(
            'file:text-foreground placeholder:text-muted-foreground/70 selection:bg-foreground selection:text-background bg-background border-border/70 flex h-10 w-full min-w-0 rounded-lg border py-2 pr-3 pl-8 text-sm tabular-nums shadow-sm transition-colors outline-none disabled:pointer-events-none disabled:opacity-50',
            'focus-visible:border-foreground/30 focus-visible:ring-2 focus-visible:ring-foreground/10',
            'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
            className,
          )}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          name={name ?? props.id}
          autoComplete={autoComplete ?? 'off'}
          {...props}
        />
      </div>
    );
  },
);

MoneyInput.displayName = 'MoneyInput';

function formatDollars(value: number | undefined): string {
  if (value == null || Number.isNaN(value)) return '';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function clamp(value: number, min?: number, max?: number): number {
  let result = value;
  if (min != null) result = Math.max(result, min);
  if (max != null) result = Math.min(result, max);
  return result;
}

export { MoneyInput };
