import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { ensureThemeSchema } from './themeSchema';

let initPromise: Promise<SQLiteDatabase> | null = null;

/**
 * Opens the DB, ensures schema, and resolves once ready.
 * Call from app startup so the first capture pays minimal cold cost.
 */
export function initDatabase(): Promise<SQLiteDatabase> {
  initPromise ??= (async () => {
    const db = await openDatabaseAsync('chinotto.db');
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS entries (
        id TEXT PRIMARY KEY NOT NULL,
        text TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'synced'))
      );
      CREATE TABLE IF NOT EXISTS sync_tombstone_outbox (
        entry_id TEXT PRIMARY KEY NOT NULL,
        enqueued_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS firestore_ingest_suppressed_ids (
        id TEXT PRIMARY KEY NOT NULL,
        suppressed_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS entry_engagement (
        entry_id TEXT PRIMARY KEY NOT NULL,
        open_count INTEGER NOT NULL DEFAULT 0,
        edit_count INTEGER NOT NULL DEFAULT 0,
        last_opened_at TEXT,
        last_edited_at TEXT
      );`
    );
    await ensureThemeSchema(db);
    return db;
  })();
  return initPromise;
}

/** Same initialization as initDatabase; use from repositories. */
export function getDatabase(): Promise<SQLiteDatabase> {
  return initDatabase();
}
