import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  KEYBOARD_SHORTCUTS,
  formatShortcut,
  isMacPlatform,
} from '@/hooks/use-keyboard-shortcut';
import type { ShortcutDefinition } from '@/hooks/use-keyboard-shortcut';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GROUP_LABELS: Record<ShortcutDefinition['group'], string> = {
  general: 'General',
  navigation: 'Navigation',
  editing: 'Editing',
};

const GROUP_ORDER: ShortcutDefinition['group'][] = [
  'general',
  'navigation',
  'editing',
];

/**
 * Dialog that displays all available keyboard shortcuts.
 *
 * Grouped by category (General, Navigation, Editing) and
 * platform-aware (shows Cmd on Mac, Ctrl on Windows/Linux).
 */
export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  const shortcutsByGroup = GROUP_ORDER.map((group) => ({
    group,
    label: GROUP_LABELS[group],
    shortcuts: KEYBOARD_SHORTCUTS.filter((s) => s.group === group),
  })).filter((g) => g.shortcuts.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate and interact faster.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          {shortcutsByGroup.map(({ group, label, shortcuts }) => (
            <div key={group} className="space-y-2">
              <h3 className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                {label}
              </h3>
              <ul className="space-y-1" role="list">
                {shortcuts.map((shortcut) => (
                  <li
                    key={`${shortcut.group}-${shortcut.key}`}
                    className="flex items-center justify-between rounded-md px-2 py-1.5"
                  >
                    <span className="text-sm">{shortcut.label}</span>
                    <kbd
                      className="bg-muted text-muted-foreground inline-flex min-w-[2rem] items-center justify-center rounded border px-1.5 py-0.5 font-mono text-xs"
                      aria-label={formatShortcutAccessible(shortcut)}
                    >
                      {formatShortcut(shortcut.key, shortcut.modifiers)}
                    </kbd>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Formats a shortcut for screen readers.
 * For example: "Command plus S" or "Control plus S".
 */
function formatShortcutAccessible(shortcut: ShortcutDefinition): string {
  const isMac = isMacPlatform();

  const modifierNames = shortcut.modifiers.map((mod) => {
    switch (mod) {
      case 'meta':
        return isMac ? 'Command' : 'Control';
      case 'ctrl':
        return 'Control';
      case 'alt':
        return isMac ? 'Option' : 'Alt';
      case 'shift':
        return 'Shift';
    }
  });

  const keyName =
    shortcut.key === 'Escape'
      ? 'Escape'
      : shortcut.key === '/'
        ? 'Slash'
        : shortcut.key === '?'
          ? 'Question mark'
          : shortcut.key.toUpperCase();

  if (modifierNames.length === 0) {
    return keyName;
  }

  return [...modifierNames, keyName].join(' plus ');
}

KeyboardShortcutsDialog.displayName = 'KeyboardShortcutsDialog';
