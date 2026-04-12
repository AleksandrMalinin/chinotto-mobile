import type { Entry } from '../types/entry';
import { sortEntriesStreamOrder } from './streamEntryOrder';

export type EntryTimeGroup = {
  label: string;
  items: Entry[];
};

/** Pinned rows first (no section header), then calendar groups for everyone else. */
export type StreamListModel = {
  pinnedLead: Entry[];
  dayGroups: EntryTimeGroup[];
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

/** Short time for a row (e.g. 14:32). */
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

const TIME_SEP = '\u00a0·\u00a0';

/**
 * Date + clock for pinned lead rows — same calendar vocabulary as stream sections (Today / Yesterday / …).
 */
export function formatPinnedEntryTemporal(
  iso: string,
  referenceDate: Date = new Date(),
  locale?: string,
): string {
  const t = formatEntryTime(iso, locale);
  const todayKey = localDateKey(referenceDate);
  const y = new Date(referenceDate);
  y.setDate(y.getDate() - 1);
  const yesterdayKey = localDateKey(y);
  const entryKey = localDateKey(parseDate(iso));
  if (entryKey === todayKey) {
    return `Today${TIME_SEP}${t}`;
  }
  if (entryKey === yesterdayKey) {
    return `Yesterday${TIME_SEP}${t}`;
  }
  return `${formatOlderSectionLabel(iso, locale)}${TIME_SEP}${t}`;
}

/**
 * Today / Yesterday / older buckets, newest-first within each — **unpinned stream only**.
 * Pinned rows are handled by {@link buildStreamListModel}.
 */
export function groupUnpinnedByCalendarDay(entries: Entry[], referenceDate: Date = new Date()): EntryTimeGroup[] {
  const sorted = [...entries].sort((a, b) => {
    const t = parseDate(b.createdAt).getTime() - parseDate(a.createdAt).getTime();
    if (t !== 0) {
      return t;
    }
    return b.id.localeCompare(a.id);
  });

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

/**
 * All `pinned` thoughts sorted for stream order (newest pinned first); mobile shows the first inline,
 * rest in overlay. Unpinned only in calendar sections — no “Pinned” header, no calendar mixing in groups.
 */
export function buildStreamListModel(entries: Entry[], referenceDate: Date = new Date()): StreamListModel {
  const pinnedLead = sortEntriesStreamOrder(entries.filter((e) => e.pinned === true));
  const unpinned = entries.filter((e) => e.pinned !== true);
  const dayGroups = groupUnpinnedByCalendarDay(unpinned, referenceDate);
  return { pinnedLead, dayGroups };
}

/** @deprecated Prefer {@link buildStreamListModel} for stream UI; kept for tests and simple chrono grouping. */
export function groupEntriesByDate(entries: Entry[], referenceDate: Date = new Date()): EntryTimeGroup[] {
  return groupUnpinnedByCalendarDay(entries, referenceDate);
}
