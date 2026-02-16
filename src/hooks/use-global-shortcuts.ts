import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut';

interface UseGlobalShortcutsReturn {
  /** Whether the keyboard shortcuts help dialog is open */
  isShortcutsDialogOpen: boolean;
  /** Setter for the shortcuts dialog open state */
  setShortcutsDialogOpen: (open: boolean) => void;
}

/**
 * Registers all global keyboard shortcuts for the application.
 *
 * This hook should be called once in the app layout so that
 * shortcuts like Cmd+D (dashboard), Cmd+E (expenses), Cmd+/
 * (help), and Cmd+S (save) work from anywhere.
 *
 * Cmd+S dispatches a custom `app:save` event on document that
 * individual pages can listen for to trigger their own save logic.
 *
 * Cmd+F dispatches a custom `app:focus-search` event on document
 * that pages with search inputs can use to focus the search field.
 */
export function useGlobalShortcuts(): UseGlobalShortcutsReturn {
  const navigate = useNavigate();
  const [isShortcutsDialogOpen, setShortcutsDialogOpen] = useState(false);

  // Cmd+/ or ? -- Show keyboard shortcuts help
  useKeyboardShortcut({
    key: '/',
    modifiers: ['meta'],
    onTrigger: useCallback(() => setShortcutsDialogOpen(true), []),
  });
  useKeyboardShortcut({
    key: '?',
    onTrigger: useCallback(() => setShortcutsDialogOpen(true), []),
  });

  // Cmd+S -- Dispatch save event (pages opt in by listening)
  useKeyboardShortcut({
    key: 's',
    modifiers: ['meta'],
    onTrigger: useCallback(() => {
      document.dispatchEvent(new CustomEvent('app:save'));
    }, []),
    allowInInput: true,
  });

  // Cmd+F -- Dispatch focus-search event
  useKeyboardShortcut({
    key: 'f',
    modifiers: ['meta'],
    onTrigger: useCallback(() => {
      document.dispatchEvent(new CustomEvent('app:focus-search'));
    }, []),
  });

  // Cmd+D -- Navigate to dashboard
  useKeyboardShortcut({
    key: 'd',
    modifiers: ['meta'],
    onTrigger: useCallback(() => {
      void navigate('/');
    }, [navigate]),
  });

  // Cmd+E -- Navigate to expenses
  useKeyboardShortcut({
    key: 'e',
    modifiers: ['meta'],
    onTrigger: useCallback(() => {
      void navigate('/expenses');
    }, [navigate]),
  });

  return {
    isShortcutsDialogOpen,
    setShortcutsDialogOpen,
  };
}
