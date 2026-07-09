import type { EntryTheme } from './entryTheme';

/** Optional `theme` field on `users/{uid}/entries/{entryId}`. */
export type FirestoreEntryThemeWire = {
  themeId: string;
  locked: boolean;
  source: string;
  confidence: number;
};

export type FirestoreUserThemeWire = {
  id: string;
  label: string;
  sortOrder: number;
};

export function toFirestoreEntryThemeWire(theme: EntryTheme): FirestoreEntryThemeWire {
  return {
    themeId: theme.themeId,
    locked: theme.locked,
    source: theme.source,
    confidence: theme.confidence,
  };
}

export function parseFirestoreEntryTheme(value: unknown): EntryTheme | null {
  if (value == null || typeof value !== 'object') {
    return null;
  }
  const o = value as Record<string, unknown>;
  const themeId = typeof o.themeId === 'string' ? o.themeId.trim() : '';
  if (!themeId) {
    return null;
  }
  return {
    themeId,
    locked: o.locked === true,
    source: typeof o.source === 'string' ? o.source : 'manual',
    confidence: typeof o.confidence === 'number' ? o.confidence : 1,
  };
}
