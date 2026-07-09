import type { TemporalRecallAnchor } from './temporalRecall';

const MS_PER_DAY = 86_400_000;

function formatAgo(createdMs: number, nowMs: number): string {
  const d = Math.floor(Math.max(0, nowMs - createdMs) / MS_PER_DAY);
  if (d >= 365) {
    const y = Math.floor(d / 365);
    return `${y} year${y === 1 ? '' : 's'} ago`;
  }
  if (d >= 30) {
    const m = Math.floor(d / 30);
    return `${m} month${m === 1 ? '' : 's'} ago`;
  }
  if (d >= 7) {
    const w = Math.floor(d / 7);
    return `${w} week${w === 1 ? '' : 's'} ago`;
  }
  if (d >= 1) {
    return `${d} day${d === 1 ? '' : 's'} ago`;
  }
  return 'earlier today';
}

function temporalReasonAnchor(anchor: TemporalRecallAnchor): string {
  switch (anchor) {
    case '24h':
      return 'From yesterday';
    case '7d':
      return 'From last week';
    case '30d':
      return 'From about a month ago';
    default:
      return 'From a while ago';
  }
}

export function formatResurfaceReason(
  anchor: TemporalRecallAnchor,
  createdAtIso: string,
  now: Date = new Date(),
): string {
  if (anchor === 'fallback') {
    const createdMs = new Date(createdAtIso).getTime();
    if (!Number.isFinite(createdMs)) {
      return 'From a while ago';
    }
    return `From ${formatAgo(createdMs, now.getTime())}.`;
  }
  return temporalReasonAnchor(anchor);
}
