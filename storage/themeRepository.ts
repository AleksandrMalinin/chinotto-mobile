import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { EntryTheme, ThemeCount } from '../types/entryTheme';
import { classifyEntryTheme } from '../utils/classifyEntryTheme';
import { MAX_USER_THEMES, SYSTEM_THEME_LINKS, THEME_RECALL_MIN_CONFIDENCE, type UserTheme } from '../utils/entryThemes';
import { addUserThemeIngestSuppressionWithDb } from '../sync/themeIngestSuppression';
import { enqueueUserThemeTombstoneWithDb, enqueueUserThemeUpsertWithDb } from '../sync/userThemeOutbox';
import { getDatabase } from './db';
import { runSerializedDb } from './runSerializedDb';
import { isThemesEnabled } from './themeSettings';

export { ensureThemeSchema } from './themeSchema';

function scheduleEntryThemePush(entryId: string): void {
  void import('../sync/entryThemePush').then((mod) => mod.pushEntryThemeToRemote(entryId));
}

function mapUserTheme(row: { id: string; label: string; sort_order: number }): UserTheme {
  return {
    id: row.id,
    label: row.label,
    sortOrder: row.sort_order,
  };
}

export async function listUserThemes(): Promise<UserTheme[]> {
  return runSerializedDb(async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ id: string; label: string; sort_order: number }>(
      `SELECT id, label, sort_order FROM user_themes ORDER BY sort_order, label`
    );
    return rows.map(mapUserTheme);
  });
}

export async function createUserTheme(label: string): Promise<UserTheme> {
  const trimmed = label.trim();
  if (!trimmed) {
    throw new Error('Theme label is required');
  }
  return runSerializedDb(async () => {
    const db = await getDatabase();
    const countRow = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) AS c FROM user_themes');
    if ((countRow?.c ?? 0) >= MAX_USER_THEMES) {
      throw new Error(`Maximum of ${MAX_USER_THEMES} themes`);
    }
    const sortRow = await db.getFirstAsync<{ next: number }>(
      'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM user_themes'
    );
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const sortOrder = sortRow?.next ?? 1;
    await db.runAsync(
      `INSERT INTO user_themes (id, label, keywords, sort_order, created_at) VALUES (?, ?, '[]', ?, ?)`,
      id,
      trimmed,
      sortOrder,
      createdAt
    );
    await enqueueUserThemeUpsertWithDb(db, id, trimmed, sortOrder);
    return { id, label: trimmed, sortOrder };
  });
}

export async function updateUserTheme(id: string, label: string): Promise<UserTheme> {
  const trimmed = label.trim();
  if (!trimmed) {
    throw new Error('Theme label is required');
  }
  return runSerializedDb(async () => {
    const db = await getDatabase();
    const existing = await db.getFirstAsync<{ sort_order: number }>(
      'SELECT sort_order FROM user_themes WHERE id = ?',
      id
    );
    if (existing == null) {
      throw new Error('Theme not found');
    }
    await db.runAsync('UPDATE user_themes SET label = ? WHERE id = ?', trimmed, id);
    await enqueueUserThemeUpsertWithDb(db, id, trimmed, existing.sort_order);
    return { id, label: trimmed, sortOrder: existing.sort_order };
  });
}

export async function deleteUserTheme(id: string): Promise<void> {
  await runSerializedDb(async () => {
    const db = await getDatabase();
    const existing = await db.getFirstAsync<{ label: string; sort_order: number }>(
      'SELECT label, sort_order FROM user_themes WHERE id = ?',
      id
    );
    if (existing == null) {
      throw new Error('Theme not found');
    }
    await enqueueUserThemeTombstoneWithDb(db, id);
    await addUserThemeIngestSuppressionWithDb(db, id);
    await db.runAsync('DELETE FROM user_themes WHERE id = ?', id);
    await db.runAsync('DELETE FROM entry_themes WHERE theme_id = ?', id);
  });
}

async function themeIdValid(db: SQLiteDatabase, themeId: string): Promise<boolean> {
  if (themeId === SYSTEM_THEME_LINKS) {
    return true;
  }
  const row = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM user_themes WHERE id = ?',
    themeId
  );
  return (row?.c ?? 0) > 0;
}

export async function getEntryTheme(entryId: string): Promise<EntryTheme | null> {
  return runSerializedDb(async () => {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{
      theme_id: string;
      confidence: number;
      source: string;
      locked: number;
    }>(
      `SELECT theme_id, confidence, source, locked FROM entry_themes WHERE entry_id = ?`,
      entryId
    );
    if (row == null) {
      return null;
    }
    return {
      themeId: row.theme_id,
      confidence: row.confidence,
      source: row.source,
      locked: row.locked !== 0,
    };
  });
}

export async function setEntryTheme(
  entryId: string,
  themeId: string | null,
  locked = true
): Promise<void> {
  await runSerializedDb(async () => {
    const db = await getDatabase();
    if (themeId != null && !(await themeIdValid(db, themeId))) {
      throw new Error('Invalid theme');
    }
    if (themeId == null) {
      await db.runAsync('DELETE FROM entry_themes WHERE entry_id = ?', entryId);
      return;
    }
    const classifiedAt = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO entry_themes (entry_id, theme_id, confidence, source, locked, classified_at)
       VALUES (?, ?, 1, 'manual', ?, ?)
       ON CONFLICT(entry_id) DO UPDATE SET
         theme_id = excluded.theme_id,
         confidence = excluded.confidence,
         source = excluded.source,
         locked = excluded.locked,
         classified_at = excluded.classified_at`,
      entryId,
      themeId,
      locked ? 1 : 0,
      classifiedAt
    );
  });
  void scheduleEntryThemePush(entryId);
}

export async function classifyEntryThemeForEntry(entryId: string, text: string): Promise<void> {
  if (!(await isThemesEnabled())) {
    return;
  }
  await runSerializedDb(async () => {
    const db = await getDatabase();
    const lockedRow = await db.getFirstAsync<{ locked: number }>(
      'SELECT locked FROM entry_themes WHERE entry_id = ?',
      entryId
    );
    if (lockedRow?.locked !== 0) {
      return;
    }
    const classification = classifyEntryTheme(text);
    if (classification == null) {
      await db.runAsync('DELETE FROM entry_themes WHERE entry_id = ? AND locked = 0', entryId);
      return;
    }
    const classifiedAt = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO entry_themes (entry_id, theme_id, confidence, source, locked, classified_at)
       VALUES (?, ?, ?, ?, 0, ?)
       ON CONFLICT(entry_id) DO UPDATE SET
         theme_id = excluded.theme_id,
         confidence = excluded.confidence,
         source = excluded.source,
         classified_at = excluded.classified_at
       WHERE locked = 0`,
      entryId,
      classification.themeId,
      classification.confidence,
      classification.source,
      classifiedAt
    );
  });
  void scheduleEntryThemePush(entryId);
}

export async function listEntryIdsWithThemes(): Promise<string[]> {
  return runSerializedDb(async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ entry_id: string }>('SELECT entry_id FROM entry_themes');
    return rows.map((row) => row.entry_id);
  });
}

export async function enqueueAllLocalUserThemesForSync(): Promise<void> {
  await runSerializedDb(async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ id: string; label: string; sort_order: number }>(
      'SELECT id, label, sort_order FROM user_themes'
    );
    for (const row of rows) {
      await enqueueUserThemeUpsertWithDb(db, row.id, row.label, row.sort_order);
    }
  });
}

export async function listThemeCounts(): Promise<ThemeCount[]> {
  return runSerializedDb(async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ theme_id: string; count: number }>(
      `SELECT theme_id, COUNT(*) AS count FROM entry_themes
       WHERE locked = 1 OR confidence >= ?
       GROUP BY theme_id`,
      THEME_RECALL_MIN_CONFIDENCE
    );
    return rows.map((row) => ({ themeId: row.theme_id, count: row.count }));
  });
}

export async function deleteEntryThemesForEntry(entryId: string): Promise<void> {
  await runSerializedDb(async () => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM entry_themes WHERE entry_id = ?', entryId);
  });
}
