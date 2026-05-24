const MS_PER_DAY = 86_400_000;

/** Human, non-clock age for Echo fragments — not stream timestamps. */
export function formatEchoRelativeAge(iso: string, now: Date = new Date()): string {
  const thenMs = new Date(iso).getTime();
  const nowMs = now.getTime();
  if (!Number.isFinite(thenMs)) {
    return '';
  }
  const days = Math.max(0, Math.floor((nowMs - thenMs) / MS_PER_DAY));
  if (days === 0) {
    return 'Today';
  }
  if (days === 1) {
    return 'Yesterday';
  }
  if (days < 7) {
    return `${days} days ago`;
  }
  if (days < 30) {
    const weeks = Math.max(1, Math.floor(days / 7));
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }
  if (days < 365) {
    const months = Math.max(1, Math.floor(days / 30));
    return months === 1 ? '1 month ago' : `${months} months ago`;
  }
  const years = Math.max(1, Math.floor(days / 365));
  return years === 1 ? '1 year ago' : `${years} years ago`;
}
