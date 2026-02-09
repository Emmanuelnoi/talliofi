import type { ReactNode } from 'react';

/**
 * Result of text highlighting operation.
 */
interface HighlightResult {
  /** Array of text segments, alternating between plain and highlighted */
  segments: ReactNode[];
  /** Whether any matches were found */
  hasMatch: boolean;
}

/**
 * Highlights matching portions of text based on a search query.
 * Performs case-insensitive matching and returns React nodes with
 * highlighted segments wrapped in <mark> elements.
 *
 * @param text - The text to search within
 * @param query - The search query to match
 * @returns Object containing segments and match status
 *
 * @example
 * ```tsx
 * const { segments, hasMatch } = highlightText('Hello World', 'wor');
 * // segments: ['Hello ', <mark>Wor</mark>, 'ld']
 * // hasMatch: true
 * ```
 */
export function highlightText(text: string, query: string): HighlightResult {
  if (!query.trim()) {
    return { segments: [text], hasMatch: false };
  }

  const normalizedQuery = query.trim().toLowerCase();
  const normalizedText = text.toLowerCase();
  const segments: ReactNode[] = [];
  let lastIndex = 0;
  let hasMatch = false;

  // Find all occurrences of the query in the text
  let searchIndex = normalizedText.indexOf(normalizedQuery, lastIndex);

  while (searchIndex !== -1) {
    hasMatch = true;

    // Add text before the match
    if (searchIndex > lastIndex) {
      segments.push(text.slice(lastIndex, searchIndex));
    }

    // Add the highlighted match (preserving original case)
    const matchEnd = searchIndex + normalizedQuery.length;
    segments.push(
      <mark
        key={searchIndex}
        className="bg-yellow-200 dark:bg-yellow-800/50 rounded-sm px-0.5"
      >
        {text.slice(searchIndex, matchEnd)}
      </mark>,
    );

    lastIndex = matchEnd;
    searchIndex = normalizedText.indexOf(normalizedQuery, lastIndex);
  }

  // Add remaining text after last match
  if (lastIndex < text.length) {
    segments.push(text.slice(lastIndex));
  }

  return { segments, hasMatch };
}

/**
 * Checks if any of the provided texts contain the search query.
 * Performs case-insensitive matching.
 *
 * @param query - The search query
 * @param texts - Array of texts to search within (undefined values are skipped)
 * @returns True if any text matches the query
 */
export function matchesSearch(
  query: string,
  ...texts: (string | undefined)[]
): boolean {
  if (!query.trim()) return true;

  const normalizedQuery = query.trim().toLowerCase();

  return texts.some(
    (text) => text && text.toLowerCase().includes(normalizedQuery),
  );
}
