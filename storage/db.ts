import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

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
      );`
    );
    return db;
  })();
  return initPromise;
}

/** Same initialization as initDatabase; use from repositories. */
export function getDatabase(): Promise<SQLiteDatabase> {
  return initDatabase();
}
