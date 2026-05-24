/** Shown under the search field when the query matches nothing. */
export const STREAM_SEARCH_MISS_LABEL = 'No thoughts with those words.';

/** Meta line under expanded search — match count or miss copy. */
export function streamSearchResultLabel(
  searchExpanded: boolean,
  queryTrimmed: string,
  resultCount: number,
): string | null {
  const q = queryTrimmed.trim();
  if (!searchExpanded || q.length === 0) {
    return null;
  }
  if (resultCount === 0) {
    return STREAM_SEARCH_MISS_LABEL;
  }
  return resultCount === 1 ? '1 thought' : `${resultCount} thoughts`;
}
