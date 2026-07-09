import type { SQLiteDatabase } from 'expo-sqlite';

import { getDatabase } from '../storage/db';
import { runSerializedDb } from '../storage/runSerializedDb';

export async function addUserThemeIngestSuppressionWithDb(
  db: SQLiteDatabase,
  themeId: string
): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO firestore_ingest_suppressed_theme_ids (id, suppressed_at) VALUES (?, ?)`,
    themeId,
    new Date().toISOString()
  );
}

export async function clearUserThemeIngestSuppression(themeId: string): Promise<void> {
  await runSerializedDb(async () => {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM firestore_ingest_suppressed_theme_ids WHERE id = ?`, themeId);
  });
}
