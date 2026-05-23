import type { Entry } from '../types/entry';
import { getEntriesOlderThan, getRecentEntries } from '../storage/entryRepository';

const JUMP_PAGE_SIZE = 40;
const JUMP_MAX_PAGES = 30;

function mergeEntriesNewestFirst(existing: Entry[], incoming: Entry[]): Entry[] {
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
