import type { Entry } from '../types/entry';

function parseCreated(iso: string): number {
  return new Date(iso).getTime();
}

/** SQLite / Firestore: 1 = pinned, 0 = not. */
export function entryPinRank(entry: Entry): 0 | 1 {
  return entry.pinned === true ? 1 : 0;
}

/**
 * Stream order aligned with desktop: **all pinned first** (newest among pinned first),
 * then all unpinned (newest first). Tie-break: `id` descending (lexicographic), per sync.md.
 */
export function compareEntriesStreamOrder(a: Entry, b: Entry): number {
  const pr = entryPinRank(b) - entryPinRank(a);
  if (pr !== 0) {
    return pr;
  }
  const t = parseCreated(b.createdAt) - parseCreated(a.createdAt);
  if (t !== 0) {
    return t;
  }
  return b.id.localeCompare(a.id);
}

export function sortEntriesStreamOrder(entries: Entry[]): Entry[] {
  return [...entries].sort(compareEntriesStreamOrder);
}

/** Newest-first by time + id only (ignores pin) — for “lead row” emphasis in the stream. */
export function compareEntriesChronologicalNewestFirst(a: Entry, b: Entry): number {
  const t = parseCreated(b.createdAt) - parseCreated(a.createdAt);
  if (t !== 0) {
    return t;
  }
  return b.id.localeCompare(a.id);
}

export function chronologicallyNewestEntryId(entries: readonly Entry[]): string | null {
  if (entries.length === 0) {
    return null;
  }
  let best = entries[0];
  for (let i = 1; i < entries.length; i++) {
    const e = entries[i];
    if (compareEntriesChronologicalNewestFirst(best, e) > 0) {
      best = e;
    }
  }
  return best.id;
}
