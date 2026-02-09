import { useEffect, useCallback } from 'react';

type KeyboardModifier = 'meta' | 'ctrl' | 'alt' | 'shift';

interface UseKeyboardShortcutOptions {
  /** The key to listen for (e.g., 'n', 'Enter', 'Escape') */
  key: string;
  /** Modifier keys required (meta = Cmd on Mac, Ctrl on Windows) */
  modifiers?: KeyboardModifier[];
  /** Callback when shortcut is triggered */
  onTrigger: () => void;
  /** Whether the shortcut is currently enabled */
  enabled?: boolean;
  /** Prevent default browser behavior when shortcut is triggered */
  preventDefault?: boolean;
}

/**
 * Hook for registering a global keyboard shortcut.
 *
 * Handles platform differences for meta/ctrl keys automatically.
 *
 * @example
 * ```tsx
 * // Open dialog with Cmd+N (Mac) / Ctrl+N (Windows)
 * useKeyboardShortcut({
 *   key: 'n',
 *   modifiers: ['meta'],
 *   onTrigger: () => setOpen(true),
 * });
 *
 * // Close dialog with Escape
 * useKeyboardShortcut({
 *   key: 'Escape',
 *   onTrigger: () => setOpen(false),
 *   enabled: isOpen,
 * });
 * ```
 */
export function useKeyboardShortcut({
  key,
  modifiers = [],
  onTrigger,
  enabled = true,
  preventDefault = true,
}: UseKeyboardShortcutOptions): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Check if the pressed key matches (case-insensitive for letters)
      const pressedKey = event.key.toLowerCase();
      const targetKey = key.toLowerCase();

      if (pressedKey !== targetKey) return;

      // Check modifiers
      const hasAllModifiers = modifiers.every((mod) => {
        switch (mod) {
          case 'meta':
            // On Mac, metaKey is Cmd. On Windows/Linux, use ctrlKey as fallback
            return (
              event.metaKey ||
              (navigator.platform.indexOf('Mac') === -1 && event.ctrlKey)
            );
          case 'ctrl':
            return event.ctrlKey;
          case 'alt':
            return event.altKey;
          case 'shift':
            return event.shiftKey;
          default:
            return false;
        }
      });

      if (!hasAllModifiers) return;

      // Don't trigger if user is typing in an input/textarea (unless it's Escape)
      const target = event.target as HTMLElement;
      const isInInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (isInInput && key.toLowerCase() !== 'escape') return;

      if (preventDefault) {
        event.preventDefault();
      }

      onTrigger();
    },
    [key, modifiers, onTrigger, enabled, preventDefault],
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
}

/**
 * Returns the platform-specific modifier key symbol.
 * Mac: Cmd symbol, Others: Ctrl
 */
export function getModifierKeySymbol(): string {
  if (
    typeof navigator !== 'undefined' &&
    navigator.platform.indexOf('Mac') !== -1
  ) {
    return '\u2318'; // Cmd symbol
  }
  return 'Ctrl';
}

/**
 * Formats a keyboard shortcut for display.
 *
 * @example
 * formatShortcut('N', ['meta']) // "⌘N" on Mac, "Ctrl+N" on Windows
 */
export function formatShortcut(
  key: string,
  modifiers: KeyboardModifier[] = [],
): string {
  const isMac =
    typeof navigator !== 'undefined' &&
    navigator.platform.indexOf('Mac') !== -1;
  const parts: string[] = [];

  for (const mod of modifiers) {
    switch (mod) {
      case 'meta':
        parts.push(isMac ? '\u2318' : 'Ctrl');
        break;
      case 'ctrl':
        parts.push(isMac ? '\u2303' : 'Ctrl');
        break;
      case 'alt':
        parts.push(isMac ? '\u2325' : 'Alt');
        break;
      case 'shift':
        parts.push(isMac ? '\u21E7' : 'Shift');
        break;
    }
  }

  parts.push(key.toUpperCase());

  return isMac ? parts.join('') : parts.join('+');
}
