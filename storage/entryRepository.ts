import { randomUUID } from 'expo-crypto';

import type { Entry } from '../types/entry';
import { firebaseMergeEntryPinned } from '../sync/firebaseSync';
import { isFirebaseSyncConfigured } from '../sync/firebaseConfig';
import { addFirestoreIngestSuppressionWithDb } from '../sync/ingestSuppression';
import { insertPendingSyncItem, removePendingSyncItemsForEntry } from '../sync/syncQueue';
import { enqueueSyncTombstoneWithDb } from '../sync/tombstoneOutbox';
import { getDatabase } from './db';
import { runSerializedDb } from './runSerializedDb';

type EntrySqlRow = {
  id: string;
  text: string;
  createdAt: string;
  pinned: number | null | undefined;
};

function entryFromRow(row: EntrySqlRow): Entry {
  const e: Entry = { id: row.id, text: row.text, createdAt: row.createdAt };
  const pin = row.pinned;
  if (pin != null && Number(pin) !== 0) {
    e.pinned = true;
  }
  return e;
}

/** Row shape from Firestore ingest (desktop → mobile); `pinned` matches wire + desktop. */
export type RemoteIngestEntryRow = Pick<Entry, 'id' | 'text' | 'createdAt' | 'pinned'>;

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
        'INSERT INTO entries (id, text, created_at, pinned) VALUES (?, ?, ?, 0)',
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
 * Toggle “important” for a thought. Local-first; when sync is on, merges `pinned` on Firestore
 * (same field as desktop).
 */
export async function setEntryPinned(entryId: string, pinned: boolean): Promise<void> {
  await runSerializedDb(async () => {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      const res = await db.runAsync('UPDATE entries SET pinned = ? WHERE id = ?', pinned ? 1 : 0, entryId);
      if (res.changes === 0) {
        throw new Error('Entry not found');
      }
    });
  });
  if (isFirebaseSyncConfigured()) {
    try {
      await firebaseMergeEntryPinned(entryId, pinned);
    } catch (err) {
      if (__DEV__) {
        console.warn('[entryRepository] firebaseMergeEntryPinned failed', err);
      }
    }
  }
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

/**
 * Upsert remote-active rows (desktop → mobile). New rows insert full payload; existing rows only
 * receive `pinned` updates so local text stays authoritative until edit-sync exists.
 */
export async function ingestRemoteFirestoreRows(rows: RemoteIngestEntryRow[]): Promise<number> {
  if (rows.length === 0) {
    return 0;
  }
  return runSerializedDb(async () => {
    const db = await getDatabase();
    let changed = 0;
    for (const row of rows) {
      const suppressed = await db.getFirstAsync<{ n: number }>(
        `SELECT 1 AS n FROM firestore_ingest_suppressed_ids WHERE id = ? LIMIT 1`,
        row.id
      );
      if (suppressed != null) {
        continue;
      }
      const pin = row.pinned === true ? 1 : 0;
      const res = await db.runAsync(
        `INSERT INTO entries (id, text, created_at, pinned) VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET pinned = excluded.pinned`,
        row.id,
        row.text,
        row.createdAt,
        pin
      );
      if (res.changes > 0) {
        changed += 1;
      }
    }
    return changed;
  });
}

/** Last row of the current stream page; pagination matches pinned-first stream order (see `utils/streamEntryOrder.ts`). */
export type EntryCursor = Pick<Entry, 'createdAt' | 'id'> & { pinned?: boolean };

export async function getRecentEntries(limit: number): Promise<Entry[]> {
  return runSerializedDb(async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<EntrySqlRow>(
      `SELECT id, text, created_at AS createdAt, COALESCE(pinned, 0) AS pinned
       FROM entries
       ORDER BY COALESCE(pinned, 0) DESC, created_at DESC, id DESC
       LIMIT ?`,
      limit
    );
    return rows.map(entryFromRow);
  });
}

/** Total local thoughts — used for sync highlight relevance (not limited to current stream page). */
export async function getEntryCount(): Promise<number> {
  return runSerializedDb(async () => {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM entries');
    return row?.n ?? 0;
  });
}

/**
 * Next page in pinned-first stream order (same comparator as `getRecentEntries`). Cursor is the
 * last row currently shown; tie-break on `id` matches docs/sync/sync.md.
 */
export async function getEntriesOlderThan(cursor: EntryCursor, limit: number): Promise<Entry[]> {
  const cursorPin = cursor.pinned === true ? 1 : 0;
  return runSerializedDb(async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<EntrySqlRow>(
      `SELECT id, text, created_at AS createdAt, COALESCE(pinned, 0) AS pinned
       FROM entries
       WHERE COALESCE(pinned, 0) < ? OR (
         COALESCE(pinned, 0) = ? AND (
           created_at < ? OR (created_at = ? AND id < ?)
         )
       )
       ORDER BY COALESCE(pinned, 0) DESC, created_at DESC, id DESC
       LIMIT ?`,
      cursorPin,
      cursorPin,
      cursor.createdAt,
      cursor.createdAt,
      cursor.id,
      limit
    );
    return rows.map(entryFromRow);
  });
}

export async function getAllEntries(): Promise<Entry[]> {
  return runSerializedDb(async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<EntrySqlRow>(
      `SELECT id, text, created_at AS createdAt, COALESCE(pinned, 0) AS pinned
       FROM entries
       ORDER BY COALESCE(pinned, 0) DESC, created_at DESC, id DESC`
    );
    return rows.map(entryFromRow);
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
    const rows = await db.getAllAsync<EntrySqlRow>(
      `SELECT id, text, created_at AS createdAt, COALESCE(pinned, 0) AS pinned
       FROM entries
       WHERE instr(lower(text), lower(?)) > 0
       ORDER BY COALESCE(pinned, 0) DESC, created_at DESC, id DESC
       LIMIT ?`,
      q,
      limit + 1
    );
    const entries = rows.map(entryFromRow);
    if (entries.length > limit) {
      return { entries: entries.slice(0, limit), truncated: true };
    }
    return { entries, truncated: false };
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
