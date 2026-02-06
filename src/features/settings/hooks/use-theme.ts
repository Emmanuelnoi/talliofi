import { useCallback, useEffect, useSyncExternalStore } from 'react';

type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'talliofi-theme';
const VALID_THEMES: readonly Theme[] = ['light', 'dark', 'system'];

/** In-memory listeners for cross-hook synchronization */
const listeners = new Set<() => void>();
let currentTheme: Theme = readStoredTheme();

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && VALID_THEMES.includes(stored as Theme)) {
    return stored as Theme;
  }
  return 'system';
}

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Theme {
  return currentTheme;
}

function getServerSnapshot(): Theme {
  return 'system';
}

/**
 * Applies the correct class to `document.documentElement` based on
 * the resolved theme (taking `system` into account).
 */
function applyThemeToDOM(theme: Theme): void {
  const root = document.documentElement;
  const prefersDark =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);

  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

/**
 * Hook for managing the application theme.
 *
 * Persists the user preference to localStorage, applies the `.dark`
 * class to `<html>`, and listens to `prefers-color-scheme` changes
 * when `'system'` is selected.
 */
export function useTheme(): { theme: Theme; setTheme: (t: Theme) => void } {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((newTheme: Theme) => {
    currentTheme = newTheme;
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyThemeToDOM(newTheme);
    emitChange();
  }, []);

  // Apply theme on mount and when it changes
  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme]);

  // Listen for OS-level color scheme changes when set to 'system'
  useEffect(() => {
    if (theme !== 'system') return;
    if (typeof window.matchMedia !== 'function') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      applyThemeToDOM('system');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [theme]);

  return { theme, setTheme };
}
