import type { Entry } from '../types/entry';
import { formatEntryTime, formatOlderSectionLabel, localDateKey } from './groupEntriesByDate';
import { keywordOverlap } from './keywords';

const MIN_OVERLAP = 2;
const MAX_CANDIDATES = 250;
const MAX_RELATED = 4;

/** Desktop `thought_trail_min_overlap` — stream dot when any pair shares this many terms. */
export const THOUGHT_TRAIL_LINK_MIN_OVERLAP = MIN_OVERLAP;

const CAPTURE_PREFIX_RE = /^([A-Za-z][A-Za-z0-9 _-]{0,22}):\s+/;

/** Informal capture stems — `AI:`, `ASD:` — group thoughts the user already labels. */
export function capturePrefixKey(text: string): string | null {
  const firstLine = text.split(/\r?\n/)[0]?.trim() ?? '';
  const match = CAPTURE_PREFIX_RE.exec(firstLine);
  if (!match) {
    return null;
  }
  const key = match[1]!.trim().toLowerCase().replace(/\s+/g, ' ');
  return key.length >= 2 ? key : null;
}

export function entriesShareCapturePrefix(a: Entry, b: Entry): boolean {
  const left = capturePrefixKey(a.text);
  const right = capturePrefixKey(b.text);
  return left != null && left === right;
}

/** Shared rule for stream dots, peel neighbors, and sheet trail rail — keyword overlap only (desktop). */
export function areThoughtTrailRelated(a: Entry, b: Entry): boolean {
  if (a.id === b.id) {
    return false;
  }
  return keywordOverlap(a.text, b.text) >= MIN_OVERLAP;
}

function thoughtTrailRelationScore(anchor: Entry, other: Entry): number {
  if (!areThoughtTrailRelated(anchor, other)) {
    return -1;
  }
  return keywordOverlap(anchor.text, other.text);
}

function parseMs(iso: string): number {
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

/** Ranked related entries for peel + sheet rail (not a feed). */
export function relatedThoughtTrailEntries(
  anchor: Entry,
  all: readonly Entry[],
  limit = MAX_RELATED,
): Entry[] {
  return all
    .filter((row) => row.id !== anchor.id)
    .map((row) => ({ row, score: thoughtTrailRelationScore(anchor, row) }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return b.row.createdAt.localeCompare(a.row.createdAt);
    })
    .slice(0, limit)
    .map((item) => item.row);
}

export function buildThoughtTrailNeighbors(
  current: Entry,
  all: readonly Entry[],
): { earlier: Entry[]; later: Entry[] } {
  const currentMs = parseMs(current.createdAt);
  const related = relatedThoughtTrailEntries(current, all, MAX_RELATED);
  const earlier: Entry[] = [];
  const later: Entry[] = [];
  for (const row of related) {
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

/** Entry ids with trail connections — dots in stream. */
export function buildThoughtTrailLinkedIds(all: readonly Entry[]): ReadonlySet<string> {
  if (all.length < 2) {
    return new Set();
  }
  const linked = new Set<string>();
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      if (areThoughtTrailRelated(all[i]!, all[j]!)) {
        linked.add(all[i]!.id);
        linked.add(all[j]!.id);
      }
    }
  }
  return linked;
}

/** When-label for trail rail — clock time or calendar date, not vague before/after. */
export function relativeTrailWhen(currentIso: string, otherIso: string, locale?: string): string {
  if (localDateKey(new Date(currentIso)) === localDateKey(new Date(otherIso))) {
    return formatEntryTime(otherIso, locale);
  }
  return formatOlderSectionLabel(otherIso, locale);
}
