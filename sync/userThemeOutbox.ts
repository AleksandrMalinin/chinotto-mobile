import type { SQLiteDatabase } from 'expo-sqlite';

import { getDatabase } from '../storage/db';
import { runSerializedDb } from '../storage/runSerializedDb';

export type UserThemeOutboxRow = {
  themeId: string;
  op: 'upsert' | 'tombstone';
  label: string | null;
  sortOrder: number | null;
  enqueuedAt: string;
};

export async function enqueueUserThemeUpsertWithDb(
  db: SQLiteDatabase,
  themeId: string,
  label: string,
  sortOrder: number
): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO sync_user_theme_outbox (theme_id, op, label, sort_order, enqueued_at)
     VALUES (?, 'upsert', ?, ?, ?)`,
    themeId,
    label,
    sortOrder,
    new Date().toISOString()
  );
}

export async function enqueueUserThemeTombstoneWithDb(db: SQLiteDatabase, themeId: string): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO sync_user_theme_outbox (theme_id, op, label, sort_order, enqueued_at)
     VALUES (?, 'tombstone', NULL, NULL, ?)`,
    themeId,
    new Date().toISOString()
  );
}

export async function listUserThemeOutbox(): Promise<UserThemeOutboxRow[]> {
  return runSerializedDb(async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      theme_id: string;
      op: string;
      label: string | null;
      sort_order: number | null;
      enqueued_at: string;
    }>(`SELECT theme_id, op, label, sort_order, enqueued_at FROM sync_user_theme_outbox ORDER BY enqueued_at ASC`);
    return rows.map((row) => ({
      themeId: row.theme_id,
      op: row.op === 'tombstone' ? 'tombstone' : 'upsert',
      label: row.label,
      sortOrder: row.sort_order,
      enqueuedAt: row.enqueued_at,
    }));
  });
}

export async function removeUserThemeOutbox(themeId: string): Promise<void> {
  await runSerializedDb(async () => {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM sync_user_theme_outbox WHERE theme_id = ?`, themeId);
  });
}

export async function clearUserThemeOutbox(): Promise<void> {
  await runSerializedDb(async () => {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM sync_user_theme_outbox`);
  });
}
