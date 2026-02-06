import { Sun, Moon, Monitor } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTheme } from '../hooks/use-theme';

const THEME_OPTIONS = [
  { value: 'light' as const, label: 'Light', icon: Sun },
  { value: 'dark' as const, label: 'Dark', icon: Moon },
  { value: 'system' as const, label: 'System', icon: Monitor },
] as const;

export function ThemeSection() {
  const { theme, setTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Choose how Talliofi looks. Select a theme or follow your system
          setting.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="flex gap-2"
          role="radiogroup"
          aria-label="Theme selection"
        >
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
            const isSelected = theme === value;
            return (
              <Button
                key={value}
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setTheme(value)}
                className={cn('flex items-center gap-2')}
              >
                <Icon className="size-4" />
                {label}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
