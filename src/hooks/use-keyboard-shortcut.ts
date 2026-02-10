import { useEffect, useCallback } from 'react';

export type KeyboardModifier = 'meta' | 'ctrl' | 'alt' | 'shift';

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
  /** Allow triggering even when focus is in an input/textarea */
  allowInInput?: boolean;
}

export function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  if ('userAgentData' in navigator) {
    return (
      (navigator as Navigator & { userAgentData?: { platform?: string } })
        .userAgentData?.platform === 'macOS'
    );
  }
  return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
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
  allowInInput = false,
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
            return event.metaKey || (!isMacPlatform() && event.ctrlKey);
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

      // Don't trigger if user is typing in an input/textarea
      // (unless it's Escape or allowInInput is set)
      const target = event.target as HTMLElement;
      const isInInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (isInInput && key.toLowerCase() !== 'escape' && !allowInInput) {
        return;
      }

      if (preventDefault) {
        event.preventDefault();
      }

      onTrigger();
    },
    [key, modifiers, onTrigger, enabled, preventDefault, allowInInput],
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
  if (isMacPlatform()) {
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
  const isMac = isMacPlatform();
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

/** A registered keyboard shortcut definition for display in the help dialog. */
export interface ShortcutDefinition {
  /** Human-readable label for the shortcut action */
  label: string;
  /** The key (e.g., 'N', 'S', 'Escape') */
  key: string;
  /** Modifier keys */
  modifiers: KeyboardModifier[];
  /** Category grouping for the help dialog */
  group: 'general' | 'navigation' | 'editing';
}

/**
 * All registered keyboard shortcuts in the application.
 * Used by the KeyboardShortcutsDialog to display available shortcuts.
 */
export const KEYBOARD_SHORTCUTS: readonly ShortcutDefinition[] = [
  {
    label: 'Quick add expense',
    key: 'N',
    modifiers: ['meta'],
    group: 'general',
  },
  {
    label: 'Show keyboard shortcuts',
    key: '?',
    modifiers: [],
    group: 'general',
  },
  {
    label: 'Show keyboard shortcuts (Cmd+/)',
    key: '/',
    modifiers: ['meta'],
    group: 'general',
  },
  {
    label: 'Close dialog / sheet',
    key: 'Escape',
    modifiers: [],
    group: 'general',
  },
  {
    label: 'Save current form',
    key: 'S',
    modifiers: ['meta'],
    group: 'editing',
  },
  {
    label: 'Focus search (expenses)',
    key: 'F',
    modifiers: ['meta'],
    group: 'editing',
  },
  {
    label: 'Go to dashboard',
    key: 'D',
    modifiers: ['meta'],
    group: 'navigation',
  },
  {
    label: 'Go to expenses',
    key: 'E',
    modifiers: ['meta'],
    group: 'navigation',
  },
] as const;
