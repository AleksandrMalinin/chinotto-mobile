import type { SQLiteDatabase } from 'expo-sqlite';

import { getDatabase } from '../storage/db';
import { runSerializedDb } from '../storage/runSerializedDb';

export async function addFirestoreIngestSuppressionWithDb(db: SQLiteDatabase, entryId: string): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO firestore_ingest_suppressed_ids (id, suppressed_at) VALUES (?, ?)`,
    entryId,
    new Date().toISOString()
  );
}

export async function isFirestoreIngestSuppressed(entryId: string): Promise<boolean> {
  return runSerializedDb(async () => {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ n: number }>(
      `SELECT 1 AS n FROM firestore_ingest_suppressed_ids WHERE id = ? LIMIT 1`,
      entryId
    );
    return row != null;
  });
}

export async function clearFirestoreIngestSuppression(entryId: string): Promise<void> {
  await runSerializedDb(async () => {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM firestore_ingest_suppressed_ids WHERE id = ?`, entryId);
  });
}
