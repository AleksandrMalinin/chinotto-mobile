const MS_PER_DAY = 86_400_000;

/**
 * Softer Echo-only time — environmental distance, not stream metadata.
 */
export function formatEchoTemporalWhisper(iso: string, now: Date = new Date()): string {
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
    return 'Earlier this week';
  }
  if (days < 22) {
    return 'A few weeks back';
  }
  if (days < 46) {
    return 'From last month';
  }
  if (days < 121) {
    return 'Earlier this year';
  }
  if (days < 400) {
    return 'From last year';
  }
  return 'Long before';
}

/** Quieter rim label — shorter buckets, no "ago". */
export function formatEchoTemporalRim(iso: string, now: Date = new Date()): string {
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
    return 'This week';
  }
  if (days < 22) {
    return 'Few weeks';
  }
  if (days < 46) {
    return 'Last month';
  }
  if (days < 121) {
    return 'This year';
  }
  if (days < 400) {
    return 'Last year';
  }
  return 'Long ago';
}
