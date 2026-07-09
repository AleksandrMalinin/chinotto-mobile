import type { SQLiteDatabase } from 'expo-sqlite';

const USER_THEME_SEEDS: { id: string; label: string; sortOrder: number }[] = [
  { id: 'book', label: 'Book', sortOrder: 1 },
  { id: 'therapy', label: 'Therapy', sortOrder: 2 },
];

export async function ensureThemeSchema(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS user_themes (
      id TEXT PRIMARY KEY NOT NULL,
      label TEXT NOT NULL,
      keywords TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS entry_themes (
      entry_id TEXT PRIMARY KEY NOT NULL,
      theme_id TEXT NOT NULL,
      confidence REAL NOT NULL,
      source TEXT NOT NULL,
      locked INTEGER NOT NULL DEFAULT 0,
      classified_at TEXT NOT NULL
    );`
  );
  const row = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) AS c FROM user_themes');
  if ((row?.c ?? 0) > 0) {
    return;
  }
  const createdAt = new Date().toISOString();
  for (const seed of USER_THEME_SEEDS) {
    await db.runAsync(
      `INSERT INTO user_themes (id, label, keywords, sort_order, created_at) VALUES (?, ?, '[]', ?, ?)`,
      seed.id,
      seed.label,
      seed.sortOrder,
      createdAt
    );
  }
}
