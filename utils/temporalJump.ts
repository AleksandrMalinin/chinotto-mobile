import type { Entry } from '../types/entry';
import type { MonthKey, MonthSummary } from '../types/temporal';
import { getEntriesOlderThan, getNewestEntryInMonth, getRecentEntries } from '../storage/entryRepository';

const JUMP_PAGE_SIZE = 40;
const JUMP_MAX_PAGES = 30;

/** Resolve the stream scroll anchor for a calendar month (cached row first, then SQLite). */
export async function resolveMonthJumpAnchor(
  monthKey: MonthKey,
  current: readonly Entry[],
  summaries: readonly MonthSummary[],
): Promise<Entry | null> {
  const summary = summaries.find((m) => m.monthKey === monthKey);
  if (summary != null) {
    const cached = current.find((e) => e.id === summary.newestEntryId);
    if (cached != null) {
      return cached;
    }
  }
  return getNewestEntryInMonth(monthKey);
}

function mergeEntriesNewestFirst(existing: readonly Entry[], incoming: readonly Entry[]): Entry[] {
  const byId = new Map<string, Entry>();
  for (const row of [...incoming, ...existing]) {
    byId.set(row.id, row);
  }
  return [...byId.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || b.id.localeCompare(a.id),
  );
}

/**
 * Ensures `anchor` is present in the newest-first stream array (paginates locally if needed).
 */
export async function loadStreamUntilEntryIncluded(anchor: Entry, current: readonly Entry[]): Promise<Entry[]> {
  if (current.some((e) => e.id === anchor.id)) {
    return [...current];
  }

  const anchorTime = new Date(anchor.createdAt).getTime();
  const newestTime = current[0] != null ? new Date(current[0].createdAt).getTime() : Infinity;
  if (anchorTime > newestTime) {
    return mergeEntriesNewestFirst(current, [anchor]);
  }

  const wide = await getRecentEntries(JUMP_PAGE_SIZE * 4);
  if (wide.some((e) => e.id === anchor.id)) {
    return mergeEntriesNewestFirst(current, wide);
  }

  let merged = mergeEntriesNewestFirst(current, wide);
  let cursor = merged[merged.length - 1];
  if (cursor == null) {
    return mergeEntriesNewestFirst(current, [anchor]);
  }

  for (let page = 0; page < JUMP_MAX_PAGES; page++) {
    const batch = await getEntriesOlderThan(cursor, JUMP_PAGE_SIZE + 1);
    if (batch.length === 0) {
      break;
    }
    const more = batch.length > JUMP_PAGE_SIZE;
    const pageRows = batch.slice(0, JUMP_PAGE_SIZE);
    merged = mergeEntriesNewestFirst(merged, pageRows);
    if (merged.some((e) => e.id === anchor.id)) {
      return merged;
    }
    if (!more) {
      break;
    }
    cursor = merged[merged.length - 1];
  }

  return mergeEntriesNewestFirst(merged, [anchor]);
}
