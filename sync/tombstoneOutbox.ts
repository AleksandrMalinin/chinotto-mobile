import type { SQLiteDatabase } from 'expo-sqlite';

import { getDatabase } from '../storage/db';
import { runSerializedDb } from '../storage/runSerializedDb';

/**
 * Durable outbox for Phase 2 tombstones. Coalesces to one row per `entry_id` (INSERT OR REPLACE).
 */
export async function enqueueSyncTombstoneWithDb(db: SQLiteDatabase, entryId: string): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO sync_tombstone_outbox (entry_id, enqueued_at) VALUES (?, ?)`,
    entryId,
    new Date().toISOString()
  );
}

export async function listSyncTombstoneOutbox(): Promise<string[]> {
  return runSerializedDb(async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ entry_id: string }>(
      `SELECT entry_id FROM sync_tombstone_outbox ORDER BY enqueued_at ASC`
    );
    return rows.map((r) => r.entry_id);
  });
}

export async function removeSyncTombstoneOutbox(entryId: string): Promise<void> {
  await runSerializedDb(async () => {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM sync_tombstone_outbox WHERE entry_id = ?`, entryId);
  });
}
