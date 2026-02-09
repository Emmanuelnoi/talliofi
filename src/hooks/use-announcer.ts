import { useCallback } from 'react';
import { useAnnouncerStore } from '@/stores/announcer-store';

/**
 * Hook to announce messages to screen readers via ARIA live regions.
 *
 * This provides a way to programmatically announce dynamic content changes
 * to assistive technologies without requiring focus changes.
 *
 * @example
 * ```tsx
 * function SearchResults({ results }) {
 *   const { announce } = useAnnouncer();
 *
 *   useEffect(() => {
 *     announce(`Found ${results.length} results`);
 *   }, [results.length, announce]);
 *
 *   return <ResultsList results={results} />;
 * }
 * ```
 */
export function useAnnouncer() {
  const setMessage = useAnnouncerStore((state) => state.setMessage);
  const clear = useAnnouncerStore((state) => state.clear);

  /**
   * Announce a message to screen readers.
   *
   * @param message - The message to announce
   * @param politeness - 'polite' (default) waits for silence, 'assertive' interrupts
   */
  const announce = useCallback(
    (message: string, politeness: 'polite' | 'assertive' = 'polite') => {
      setMessage(message, politeness);
    },
    [setMessage],
  );

  return {
    announce,
    clear,
  };
}
