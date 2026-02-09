import { useCallback, useMemo, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/**
 * Option for multi-select dropdown.
 */
export interface MultiSelectOption {
  /** Unique value for this option */
  value: string;
  /** Display label */
  label: string;
  /** Optional color indicator (hex color) */
  color?: string;
}

interface MultiSelectProps {
  /** Available options to select from */
  options: MultiSelectOption[];
  /** Currently selected values */
  value: string[];
  /** Callback when selection changes */
  onChange: (value: string[]) => void;
  /** Placeholder when nothing selected */
  placeholder?: string;
  /** Accessible label for the trigger button */
  ariaLabel?: string;
  /** Additional class names for the trigger */
  className?: string;
  /** Whether the control is disabled */
  disabled?: boolean;
}

/**
 * Multi-select dropdown component with support for color indicators.
 * Uses Radix Popover for accessibility and keyboard navigation.
 */
export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  ariaLabel,
  className,
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedSet = useMemo(() => new Set(value), [value]);

  const selectedLabels = useMemo(() => {
    return options
      .filter((opt) => selectedSet.has(opt.value))
      .map((opt) => opt.label);
  }, [options, selectedSet]);

  const handleToggle = useCallback(
    (optValue: string) => {
      if (selectedSet.has(optValue)) {
        onChange(value.filter((v) => v !== optValue));
      } else {
        onChange([...value, optValue]);
      }
    },
    [value, onChange, selectedSet],
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange([]);
    },
    [onChange],
  );

  const displayText =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length === 1
        ? selectedLabels[0]
        : `${selectedLabels.length} selected`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          disabled={disabled}
          className={cn(
            'h-8 w-[140px] justify-between px-3 font-normal',
            value.length === 0 && 'text-muted-foreground',
            className,
          )}
        >
          <span className="truncate">{displayText}</span>
          <div className="flex shrink-0 items-center gap-1">
            {value.length > 0 && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Clear selection"
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onChange([]);
                  }
                }}
                className="hover:bg-muted rounded p-0.5"
              >
                <X className="size-3" />
              </span>
            )}
            <ChevronDown className="size-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-1" align="start">
        <div
          role="listbox"
          aria-multiselectable="true"
          aria-label={ariaLabel ?? placeholder}
          className="max-h-[300px] overflow-auto"
        >
          {options.map((option) => {
            const isSelected = selectedSet.has(option.value);
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleToggle(option.value)}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
                  'hover:bg-accent hover:text-accent-foreground',
                  'focus-visible:bg-accent focus-visible:text-accent-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded-sm border',
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground/30',
                  )}
                >
                  {isSelected && <Check className="size-3" />}
                </span>
                {option.color && (
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: option.color }}
                    aria-hidden="true"
                  />
                )}
                <span className="truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
