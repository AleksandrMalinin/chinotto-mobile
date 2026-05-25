/** One-line submerged preview on palimpsest rims. */
export function echoPalimpsestRimExcerpt(text: string, maxChars = 18): string {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (normalized.length === 0) {
    return '';
  }
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, maxChars).trimEnd()}…`;
}
