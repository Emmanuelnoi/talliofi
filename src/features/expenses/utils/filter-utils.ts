export function getNoResultsDescription(
  searchQuery: string,
  filterCount: number,
): string {
  const suggestions: string[] = [];

  if (searchQuery.trim()) {
    suggestions.push('check your spelling or try different keywords');
  }

  if (filterCount > 0) {
    suggestions.push('try removing some filters');
  }

  if (suggestions.length === 0) {
    return 'Try adjusting your search or filters to see more results.';
  }

  return `Try ${suggestions.join(' or ')}.`;
}
