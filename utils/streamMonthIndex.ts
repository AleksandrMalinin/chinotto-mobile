import type { Entry } from '../types/entry';
import type { MonthKey, MonthSummary } from '../types/temporal';

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Local calendar month key `YYYY-MM` from an ISO `createdAt`. */
export function monthKeyFromIso(iso: string): MonthKey {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

export function yearFromMonthKey(monthKey: MonthKey): number {
  return Number(monthKey.slice(0, 4));
}

export function parseMonthKey(monthKey: MonthKey): { year: number; month: number } {
  const [y, m] = monthKey.split('-');
  return { year: Number(y), month: Number(m) };
}

/**
 * Month anchor for scroll sync — `contentOffsetY` is filled after layout (-1 = unknown).
 */
export type MonthAnchor = {
  monthKey: MonthKey;
  firstEntryId: string;
  contentOffsetY: number;
};

/**
 * Newest-first month summaries (for map sheet). Input must already be sorted newest-first per month.
 */
export function sortMonthSummariesNewestFirst(summaries: MonthSummary[]): MonthSummary[] {
  return [...summaries].sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}

/**
 * Label for floating scrubber — omits year within the same calendar year as `referenceMonthKey`.
 */
export function formatMonthScrubberLabel(
  monthKey: MonthKey,
  referenceMonthKey: MonthKey | null,
  locale?: string,
): string {
  const { year, month } = parseMonthKey(monthKey);
  const refYear = referenceMonthKey != null ? yearFromMonthKey(referenceMonthKey) : year;
  const date = new Date(year, month - 1, 1);
  if (year !== refYear) {
    return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  }
  return date.toLocaleDateString(locale, { month: 'long' });
}

/** Compact rack row — short month only (year lives in the rack header). */
export function formatMonthRackLabel(monthKey: MonthKey, locale?: string): string {
  const { year, month } = parseMonthKey(monthKey);
  return new Date(year, month - 1, 1).toLocaleDateString(locale, { month: 'short' });
}

/** Quiet year header for temporal map sheet and rack chrome. */
export function formatTemporalYearLabel(year: number, locale?: string): string {
  return new Date(year, 0, 1).toLocaleDateString(locale, { year: 'numeric' });
}

/** Year pinned above the month rack; tracks the centered month while scrubbing. */
export function formatMonthRackYearLabel(monthKey: MonthKey, locale?: string): string {
  return formatTemporalYearLabel(yearFromMonthKey(monthKey), locale);
}

/**
 * Ambient count line — avoids “notes” / productivity wording.
 */
export function formatMonthThoughtCount(count: number): string | null {
  if (count <= 0) {
    return null;
  }
  if (count === 1) {
    return '1 thought';
  }
  return `${count} thoughts`;
}

/**
 * Relative activity 0–1 for a soft bar (vs max count in timeline).
 */
export function monthActivityRatio(count: number, maxCount: number): number {
  if (maxCount <= 0 || count <= 0) {
    return 0;
  }
  return Math.min(1, count / maxCount);
}

/**
 * Pick the month visible at the top of the stream from layout anchors (newest-first scroll).
 * Uses largest anchor Y that is still at or above the viewport top (with optional bias).
 */
export function pickVisibleMonthKeyFromAnchors(
  anchors: readonly MonthAnchor[],
  scrollY: number,
  biasPx = 0,
): MonthKey | null {
  if (anchors.length === 0) {
    return null;
  }
  const targetY = scrollY + biasPx;
  let chosen: MonthAnchor | null = null;
  for (const anchor of anchors) {
    if (anchor.contentOffsetY < 0) {
      continue;
    }
    if (anchor.contentOffsetY <= targetY) {
      if (chosen == null || anchor.contentOffsetY > chosen.contentOffsetY) {
        chosen = anchor;
      }
    }
  }
  if (chosen != null) {
    return chosen.monthKey;
  }
  const withY = anchors.filter((a) => a.contentOffsetY >= 0);
  if (withY.length === 0) {
    return anchors[0]?.monthKey ?? null;
  }
  return withY.reduce((a, b) => (a.contentOffsetY < b.contentOffsetY ? a : b)).monthKey;
}

/**
 * Derive month anchors from loaded entries (newest first). Layout must set `contentOffsetY`.
 */
export function buildMonthAnchorsFromEntries(entries: readonly Entry[]): MonthAnchor[] {
  const seen = new Set<MonthKey>();
  const anchors: MonthAnchor[] = [];
  for (const entry of entries) {
    const key = monthKeyFromIso(entry.createdAt);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    anchors.push({ monthKey: key, firstEntryId: entry.id, contentOffsetY: -1 });
  }
  return anchors;
}

/**
 * Fallback when layout anchors are missing: walk entries in display order (newest first).
 */
export function pickVisibleMonthKeyFromEntries(
  entries: readonly Entry[],
  scrollY: number,
  /** Monotonic offsets per entry id (content Y of row top). */
  offsetsByEntryId: ReadonlyMap<string, number>,
  listOffsetY: number,
  listPaddingTop: number,
  viewportBiasPx = 0,
): MonthKey | null {
  if (entries.length === 0) {
    return null;
  }
  const targetY = scrollY + viewportBiasPx;
  let best: { monthKey: MonthKey; top: number } | null = null;
  const seenMonth = new Set<MonthKey>();
  for (const entry of entries) {
    const monthKey = monthKeyFromIso(entry.createdAt);
    if (seenMonth.has(monthKey)) {
      continue;
    }
    seenMonth.add(monthKey);
    const top = offsetsByEntryId.get(entry.id);
    if (top == null) {
      continue;
    }
    const topInScroll = listOffsetY + listPaddingTop + top;
    if (topInScroll <= targetY) {
      if (best == null || topInScroll > best.top) {
        best = { monthKey, top: topInScroll };
      }
    }
  }
  return best?.monthKey ?? monthKeyFromIso(entries[0].createdAt);
}
