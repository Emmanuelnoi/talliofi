import { useCallback, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { DateRange, DateRangePreset } from '../types';
import {
  getDateRangeFromPreset,
  getPresetLabel,
  formatDateRange,
} from '../utils/report-calculations';

interface DateRangeSelectorProps {
  /** Current date range preset */
  preset: DateRangePreset;
  /** Current custom start date (ISO string) */
  customStart: string;
  /** Current custom end date (ISO string) */
  customEnd: string;
  /** Callback when preset changes */
  onPresetChange: (preset: DateRangePreset) => void;
  /** Callback when custom start date changes */
  onCustomStartChange: (date: string) => void;
  /** Callback when custom end date changes */
  onCustomEndChange: (date: string) => void;
}

const PRESET_OPTIONS: DateRangePreset[] = [
  'this_month',
  'last_month',
  'last_3_months',
  'last_6_months',
  'year_to_date',
  'last_year',
  'custom',
];

/**
 * Date range selector with presets and custom range support.
 */
export function DateRangeSelector({
  preset,
  customStart,
  customEnd,
  onPresetChange,
  onCustomStartChange,
  onCustomEndChange,
}: DateRangeSelectorProps) {
  const isCustom = preset === 'custom';

  // Get the effective date range
  const effectiveDateRange = useMemo((): DateRange => {
    if (isCustom && customStart && customEnd) {
      return {
        start: parseISO(customStart),
        end: parseISO(customEnd),
      };
    }
    return getDateRangeFromPreset(preset);
  }, [preset, customStart, customEnd, isCustom]);

  const handlePresetChange = useCallback(
    (value: string) => {
      const newPreset = value as DateRangePreset;
      onPresetChange(newPreset);

      // If switching to custom, initialize with current date range
      if (newPreset === 'custom') {
        const range = getDateRangeFromPreset('this_month');
        onCustomStartChange(format(range.start, 'yyyy-MM-dd'));
        onCustomEndChange(format(range.end, 'yyyy-MM-dd'));
      }
    },
    [onPresetChange, onCustomStartChange, onCustomEndChange],
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Preset Selector */}
      <Select value={preset} onValueChange={handlePresetChange}>
        <SelectTrigger
          className="w-full sm:w-[180px]"
          aria-label="Date range preset"
        >
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          {PRESET_OPTIONS.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {getPresetLabel(opt)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Custom Date Pickers (only shown when custom is selected) */}
      {isCustom && (
        <div className="flex items-center gap-2">
          <DatePicker
            value={customStart}
            onChange={onCustomStartChange}
            placeholder="Start date"
            ariaLabel="Start date"
          />
          <span className="text-muted-foreground">to</span>
          <DatePicker
            value={customEnd}
            onChange={onCustomEndChange}
            placeholder="End date"
            ariaLabel="End date"
            minDate={customStart}
          />
        </div>
      )}

      {/* Current Range Display */}
      <span className="text-muted-foreground text-sm">
        {formatDateRange(effectiveDateRange)}
      </span>
    </div>
  );
}

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  minDate?: string;
}

function DatePicker({
  value,
  onChange,
  placeholder,
  ariaLabel,
  minDate,
}: DatePickerProps) {
  const selectedDate = value ? parseISO(value) : undefined;
  const minDateParsed = minDate ? parseISO(minDate) : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-[130px] justify-start text-left font-normal',
            !value && 'text-muted-foreground',
          )}
          aria-label={ariaLabel}
        >
          <CalendarIcon className="mr-2 size-4" />
          {value ? format(parseISO(value), 'MMM d, yyyy') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (date) {
              onChange(format(date, 'yyyy-MM-dd'));
            }
          }}
          disabled={minDateParsed ? { before: minDateParsed } : undefined}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
