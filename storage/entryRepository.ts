import { randomUUID } from 'expo-crypto';

import type { Entry } from '../types/entry';
import { isFirebaseSyncConfigured } from '../sync/firebaseConfig';
import { addFirestoreIngestSuppressionWithDb } from '../sync/ingestSuppression';
import { insertPendingSyncItem, removePendingSyncItemsForEntry } from '../sync/syncQueue';
import { enqueueSyncTombstoneWithDb } from '../sync/tombstoneOutbox';
import { getDatabase } from './db';
import { runSerializedDb } from './runSerializedDb';

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

  await runSerializedDb(async () => {
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
  });

  return entry;
}

/**
 * Local-first delete. When Firebase sync is configured: suppression + tombstone outbox (Phase 2).
 */
export async function deleteEntry(entryId: string): Promise<void> {
  const configured = isFirebaseSyncConfigured();
  await runSerializedDb(async () => {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      const row = await db.getFirstAsync<{ id: string }>('SELECT id FROM entries WHERE id = ?', entryId);
      if (!row) {
        throw new Error('Entry not found');
      }
      await db.runAsync('DELETE FROM entries WHERE id = ?', entryId);
      await removePendingSyncItemsForEntry(db, entryId);
      if (configured) {
        await addFirestoreIngestSuppressionWithDb(db, entryId);
        await enqueueSyncTombstoneWithDb(db, entryId);
      }
    });
  });
}

/** Remote tombstones from Firestore snapshot: physical delete + cleanup queue/outbox/suppression. */
export async function applyRemoteTombstoneDeletes(entryIds: string[]): Promise<number> {
  if (entryIds.length === 0) {
    return 0;
  }
  return runSerializedDb(async () => {
    const db = await getDatabase();
    let removed = 0;
    await db.withTransactionAsync(async () => {
      for (const id of entryIds) {
        await removePendingSyncItemsForEntry(db, id);
        await db.runAsync('DELETE FROM sync_tombstone_outbox WHERE entry_id = ?', id);
        const res = await db.runAsync('DELETE FROM entries WHERE id = ?', id);
        if (res.changes > 0) {
          removed += 1;
        }
        await db.runAsync('DELETE FROM firestore_ingest_suppressed_ids WHERE id = ?', id);
      }
    });
    return removed;
  });
}

/** Insert remote-active rows if not present and not suppressed (desktop → mobile). */
export async function ingestRemoteFirestoreRows(rows: Pick<Entry, 'id' | 'text' | 'createdAt'>[]): Promise<number> {
  if (rows.length === 0) {
    return 0;
  }
  return runSerializedDb(async () => {
    const db = await getDatabase();
    let inserted = 0;
    for (const row of rows) {
      const suppressed = await db.getFirstAsync<{ n: number }>(
        `SELECT 1 AS n FROM firestore_ingest_suppressed_ids WHERE id = ? LIMIT 1`,
        row.id
      );
      if (suppressed != null) {
        continue;
      }
      const res = await db.runAsync(
        `INSERT OR IGNORE INTO entries (id, text, created_at) VALUES (?, ?, ?)`,
        row.id,
        row.text,
        row.createdAt
      );
      if (res.changes > 0) {
        inserted += 1;
      }
    }
    return inserted;
  });
}

export type EntryCursor = Pick<Entry, 'createdAt' | 'id'>;

export async function getRecentEntries(limit: number): Promise<Entry[]> {
  return runSerializedDb(async () => {
    const db = await getDatabase();
    return db.getAllAsync<Entry>(
      `SELECT id, text, created_at AS createdAt
       FROM entries
       ORDER BY created_at DESC, id DESC
       LIMIT ?`,
      limit
    );
  });
}

/**
 * Next page in global newest-first order. Tie-break on `id` matches docs/sync/sync.md ordering.
 */
export async function getEntriesOlderThan(cursor: EntryCursor, limit: number): Promise<Entry[]> {
  return runSerializedDb(async () => {
    const db = await getDatabase();
    return db.getAllAsync<Entry>(
      `SELECT id, text, created_at AS createdAt
       FROM entries
       WHERE created_at < ? OR (created_at = ? AND id < ?)
       ORDER BY created_at DESC, id DESC
       LIMIT ?`,
      cursor.createdAt,
      cursor.createdAt,
      cursor.id,
      limit
    );
  });
}

export async function getAllEntries(): Promise<Entry[]> {
  return runSerializedDb(async () => {
    const db = await getDatabase();
    return db.getAllAsync<Entry>(
      `SELECT id, text, created_at AS createdAt
       FROM entries
       ORDER BY created_at DESC, id DESC`
    );
  });
}

const SEARCH_DEFAULT_LIMIT = 300;

export type SearchEntriesRecallResult = {
  entries: Entry[];
  /** True when more than `limit` rows matched; only the first `limit` are returned. */
  truncated: boolean;
};

/**
 * Search with optional limit transparency: requests `limit + 1` rows to detect truncation.
 */
export async function searchEntriesForRecall(
  needle: string,
  limit: number = SEARCH_DEFAULT_LIMIT
): Promise<SearchEntriesRecallResult> {
  const q = needle.trim();
  if (!q) {
    return { entries: [], truncated: false };
  }
  return runSerializedDb(async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Entry>(
      `SELECT id, text, created_at AS createdAt
       FROM entries
       WHERE instr(lower(text), lower(?)) > 0
       ORDER BY created_at DESC, id DESC
       LIMIT ?`,
      q,
      limit + 1
    );
    if (rows.length > limit) {
      return { entries: rows.slice(0, limit), truncated: true };
    }
    return { entries: rows, truncated: false };
  });
}

/**
 * Case-insensitive substring match on `text`. Uses `instr` so user input is literal (no LIKE wildcards).
 * Fetches up to `limit` rows (internally uses `searchEntriesForRecall`).
 */
export async function searchEntriesByText(needle: string, limit: number = SEARCH_DEFAULT_LIMIT): Promise<Entry[]> {
  const { entries } = await searchEntriesForRecall(needle, limit);
  return entries;
}
