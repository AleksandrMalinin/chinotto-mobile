import type { EntryTheme } from '../types/entryTheme';
import type { FirestoreUserThemeWire } from '../types/firestoreSyncTheme';
import { getDatabase } from './db';
import { runSerializedDb } from './runSerializedDb';

export async function applyRemoteEntryTheme(
  entryId: string,
  remote: EntryTheme | null
): Promise<boolean> {
  return runSerializedDb(async () => {
    const db = await getDatabase();
    const local = await db.getFirstAsync<{ locked: number }>(
      'SELECT locked FROM entry_themes WHERE entry_id = ?',
      entryId
    );
    if (local?.locked !== 0) {
      return false;
    }
    if (remote == null) {
      const res = await db.runAsync('DELETE FROM entry_themes WHERE entry_id = ? AND locked = 0', entryId);
      return res.changes > 0;
    }
    const classifiedAt = new Date().toISOString();
    const res = await db.runAsync(
      `INSERT INTO entry_themes (entry_id, theme_id, confidence, source, locked, classified_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(entry_id) DO UPDATE SET
         theme_id = excluded.theme_id,
         confidence = excluded.confidence,
         source = excluded.source,
         locked = excluded.locked,
         classified_at = excluded.classified_at
       WHERE locked = 0`,
      entryId,
      remote.themeId,
      remote.confidence,
      remote.source,
      remote.locked ? 1 : 0,
      classifiedAt
    );
    return res.changes > 0;
  });
}

export async function applyRemoteUserThemeTombstones(themeIds: string[]): Promise<number> {
  if (themeIds.length === 0) {
    return 0;
  }
  return runSerializedDb(async () => {
    const db = await getDatabase();
    let removed = 0;
    await db.withTransactionAsync(async () => {
      for (const themeId of themeIds) {
        const suppressed = await db.getFirstAsync<{ n: number }>(
          `SELECT 1 AS n FROM firestore_ingest_suppressed_theme_ids WHERE id = ? LIMIT 1`,
          themeId
        );
        if (suppressed != null) {
          continue;
        }
        await db.runAsync('DELETE FROM entry_themes WHERE theme_id = ?', themeId);
        const res = await db.runAsync('DELETE FROM user_themes WHERE id = ?', themeId);
        if (res.changes > 0) {
          removed += 1;
        }
        await db.runAsync('DELETE FROM firestore_ingest_suppressed_theme_ids WHERE id = ?', themeId);
      }
    });
    return removed;
  });
}

export async function ingestRemoteUserThemeRows(rows: FirestoreUserThemeWire[]): Promise<number> {
  if (rows.length === 0) {
    return 0;
  }
  return runSerializedDb(async () => {
    const db = await getDatabase();
    let applied = 0;
    for (const row of rows) {
      const suppressed = await db.getFirstAsync<{ n: number }>(
        `SELECT 1 AS n FROM firestore_ingest_suppressed_theme_ids WHERE id = ? LIMIT 1`,
        row.id
      );
      if (suppressed != null) {
        continue;
      }
      const label = row.label.trim();
      if (!label) {
        continue;
      }
      const res = await db.runAsync(
        `INSERT INTO user_themes (id, label, keywords, sort_order, created_at)
         VALUES (?, ?, '[]', ?, ?)
         ON CONFLICT(id) DO UPDATE SET label = excluded.label, sort_order = excluded.sort_order`,
        row.id,
        label,
        row.sortOrder,
        new Date().toISOString()
      );
      if (res.changes > 0) {
        applied += 1;
      }
    }
    return applied;
  });
}
