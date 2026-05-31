import type { Entry } from '../types/entry';

export type EntryTimeGroup = {
  label: string;
  items: Entry[];
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Local calendar day key for grouping (YYYY-MM-DD). */
export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseDate(iso: string): Date {
  return new Date(iso);
}

/** Short time for a row (e.g. 14:32). Used for the detail sheet + accessibility (precise). */
export function formatEntryTime(iso: string, locale?: string): string {
  return parseDate(iso).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Section label for a calendar day before today/yesterday (quiet, scannable). */
export function formatOlderSectionLabel(iso: string, locale?: string): string {
  return parseDate(iso).toLocaleDateString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Groups entries into Today / Yesterday / per-day older buckets, newest first within each.
 * `referenceDate` defaults to now; inject in tests for stable grouping.
 */
export function groupEntriesByDate(entries: Entry[], referenceDate: Date = new Date()): EntryTimeGroup[] {
  const sorted = [...entries].sort(
    (a, b) => parseDate(b.createdAt).getTime() - parseDate(a.createdAt).getTime()
  );

  const todayKey = localDateKey(referenceDate);
  const y = new Date(referenceDate);
  y.setDate(y.getDate() - 1);
  const yesterdayKey = localDateKey(y);

  const today: Entry[] = [];
  const yesterday: Entry[] = [];
  const olderByDay = new Map<string, Entry[]>();

  for (const entry of sorted) {
    const key = localDateKey(parseDate(entry.createdAt));
    if (key === todayKey) {
      today.push(entry);
    } else if (key === yesterdayKey) {
      yesterday.push(entry);
    } else {
      const list = olderByDay.get(key) ?? [];
      list.push(entry);
      olderByDay.set(key, list);
    }
  }

  const out: EntryTimeGroup[] = [];
  if (today.length > 0) {
    out.push({ label: 'Today', items: today });
  }
  if (yesterday.length > 0) {
    out.push({ label: 'Yesterday', items: yesterday });
  }

  const olderKeys = [...olderByDay.keys()].sort((a, b) => b.localeCompare(a));
  for (const dayKey of olderKeys) {
    const items = olderByDay.get(dayKey)!;
    out.push({
      label: formatOlderSectionLabel(items[0].createdAt),
      items,
    });
  }

  return out;
}
