import type { Entry } from '../types/entry';
import { localDateKey } from './groupEntriesByDate';
import { isUnfinishedEntryText } from './echoContinuitySignals';

function parseCreatedAt(iso: string): Date {
  return new Date(iso);
}

function isTodayEntry(entry: Entry, referenceDate: Date): boolean {
  return localDateKey(parseCreatedAt(entry.createdAt)) === localDateKey(referenceDate);
}

/**
 * Picks up to `max` entry ids to float just below the Today band (B3).
 * Skips ids on cooldown, today's rows, and the chronologically newest row.
 */
export function pickStreamTideEntryIds(
  entries: readonly Entry[],
  options: {
    max?: number;
    referenceDate?: Date;
    cooldownIds?: ReadonlySet<string>;
    lastOpenedId?: string | null;
    echoCandidateIds?: readonly string[];
  } = {},
): string[] {
  const max = options.max ?? 2;
  const referenceDate = options.referenceDate ?? new Date();
  const cooldown = options.cooldownIds ?? new Set<string>();
  if (entries.length === 0 || max <= 0) {
    return [];
  }

  const sorted = [...entries].sort(
    (a, b) => parseCreatedAt(b.createdAt).getTime() - parseCreatedAt(a.createdAt).getTime(),
  );
  const newestId = sorted[0]?.id ?? null;

  const eligible = (id: string): boolean => {
    if (id === newestId || cooldown.has(id)) {
      return false;
    }
    const row = sorted.find((e) => e.id === id);
    if (row == null || isTodayEntry(row, referenceDate)) {
      return false;
    }
    return true;
  };

  const picked: string[] = [];
  const push = (id: string | null | undefined) => {
    if (id == null || picked.includes(id) || !eligible(id)) {
      return;
    }
    picked.push(id);
  };

  push(options.lastOpenedId);

  for (const id of options.echoCandidateIds ?? []) {
    if (picked.length >= max) {
      break;
    }
    push(id);
  }

  for (const row of sorted) {
    if (picked.length >= max) {
      break;
    }
    if (!isUnfinishedEntryText(row.text)) {
      continue;
    }
    push(row.id);
  }

  return picked.slice(0, max);
}

/**
 * Moves tide entries directly after the Today block (or to the top if no Today rows).
 */
export function mergeStreamTideEntries(
  entries: readonly Entry[],
  tideIds: readonly string[],
  referenceDate: Date = new Date(),
): Entry[] {
  if (tideIds.length === 0) {
    return [...entries];
  }

  const tideSet = new Set(tideIds);
  const sorted = [...entries].sort(
    (a, b) => parseCreatedAt(b.createdAt).getTime() - parseCreatedAt(a.createdAt).getTime(),
  );
  const tideRows = tideIds
    .map((id) => sorted.find((e) => e.id === id))
    .filter((e): e is Entry => e != null);
  if (tideRows.length === 0) {
    return sorted;
  }

  const rest = sorted.filter((e) => !tideSet.has(e.id));
  const todayKey = localDateKey(referenceDate);
  const today: Entry[] = [];
  const afterToday: Entry[] = [];
  for (const row of rest) {
    if (localDateKey(parseCreatedAt(row.createdAt)) === todayKey) {
      today.push(row);
    } else {
      afterToday.push(row);
    }
  }

  return [...today, ...tideRows, ...afterToday];
}
