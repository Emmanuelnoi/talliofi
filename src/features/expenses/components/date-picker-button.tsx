import { format, parseISO } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DatePickerButtonProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
}

export function DatePickerButton({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: DatePickerButtonProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'h-8 w-[110px] justify-start text-left font-normal',
            !value && 'text-muted-foreground',
          )}
          aria-label={ariaLabel}
        >
          <CalendarIcon className="mr-1 size-3" />
          <span className="truncate">
            {value ? format(parseISO(value), 'MMM d, yy') : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ? parseISO(value) : undefined}
          onSelect={(date) => {
            onChange(date ? format(date, 'yyyy-MM-dd') : '');
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
