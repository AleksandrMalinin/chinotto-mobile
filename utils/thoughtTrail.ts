import type { Entry } from '../types/entry';
import { keywordOverlap } from './keywords';

const MIN_OVERLAP = 2;
const MAX_CANDIDATES = 250;
const MAX_RELATED = 4;

function parseMs(iso: string): number {
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

export function buildThoughtTrailNeighbors(
  current: Entry,
  all: readonly Entry[],
): { earlier: Entry[]; later: Entry[] } {
  const currentMs = parseMs(current.createdAt);
  const candidates = all
    .filter((row) => row.id !== current.id)
    .sort((a, b) => {
      const overlapDiff = keywordOverlap(current.text, b.text) - keywordOverlap(current.text, a.text);
      if (overlapDiff !== 0) {
        return overlapDiff;
      }
      return b.createdAt.localeCompare(a.createdAt);
    })
    .slice(0, MAX_CANDIDATES)
    .filter((row) => keywordOverlap(current.text, row.text) >= MIN_OVERLAP)
    .slice(0, MAX_RELATED);

  const earlier: Entry[] = [];
  const later: Entry[] = [];
  for (const row of candidates) {
    if (parseMs(row.createdAt) < currentMs) {
      earlier.push(row);
    } else if (parseMs(row.createdAt) > currentMs) {
      later.push(row);
    }
  }
  earlier.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  later.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return { earlier, later };
}

export function relativeTrailWhen(currentIso: string, otherIso: string): string {
  const days = Math.round((parseMs(otherIso) - parseMs(currentIso)) / 86_400_000);
  if (days === 0) {
    return 'Same day';
  }
  if (days < 0) {
    const n = Math.abs(days);
    return `${n} day${n === 1 ? '' : 's'} earlier`;
  }
  return `${days} day${days === 1 ? '' : 's'} later`;
}
