import { randomUUID } from 'expo-crypto';

import type { Entry } from '../types/entry';
import { insertPendingSyncItem } from '../sync/syncQueue';
import { getDatabase } from './db';

export async function saveEntry(text: string): Promise<Entry> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Cannot save empty entry');
  }

  const entry: Entry = {
    id: randomUUID(),
    text: trimmed,
    createdAt: new Date().toISOString(),
  };

  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'INSERT INTO entries (id, text, created_at) VALUES (?, ?, ?)',
      entry.id,
      entry.text,
      entry.createdAt
    );
    await insertPendingSyncItem(db, entry);
  });

  return entry;
}

export async function getRecentEntries(limit: number): Promise<Entry[]> {
  const db = await getDatabase();
  return db.getAllAsync<Entry>(
    `SELECT id, text, created_at AS createdAt
     FROM entries
     ORDER BY created_at DESC
     LIMIT ?`,
    limit
  );
}

export async function getAllEntries(): Promise<Entry[]> {
  const db = await getDatabase();
  return db.getAllAsync<Entry>(
    `SELECT id, text, created_at AS createdAt
     FROM entries
     ORDER BY created_at DESC`
  );
}
