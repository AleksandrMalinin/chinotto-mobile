import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import type { Entry } from '../types/entry';
import {
  applyRemoteTombstoneDeletes,
  ingestRemoteFirestoreRows,
} from '../storage/entryRepository';
import { getOrInitAuth } from './firebaseAuth';
import { getOrInitFirestore } from './firebaseSync';
import { isFirebaseSyncConfigured } from './firebaseConfig';
import { isFirestoreDocumentTombstoned } from './firestoreTombstone';
import { flushSyncTombstoneOutbox } from './tombstoneFlush';

const INGEST_PAGE_SIZE = 500;
/** Tombstones are queried separately so deletes on older entries (outside the recent ingest window) still apply locally. */
const TOMBSTONE_QUERY_LIMIT = 1000;

export type FirestoreIngestRow = Pick<Entry, 'id' | 'text' | 'createdAt'>;

function normalizeCreatedAt(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

function partitionFirestoreSnapshotDocs(
  docs: QueryDocumentSnapshot<DocumentData>[]
): { tombstonedIds: string[]; activeRows: FirestoreIngestRow[] } {
  const tombstonedIds: string[] = [];
  const activeRows: FirestoreIngestRow[] = [];
  for (const d of docs) {
    const data = d.data();
    if (isFirestoreDocumentTombstoned(data)) {
      tombstonedIds.push(d.id);
      continue;
    }
    const text = typeof data.text === 'string' ? data.text.trim() : '';
    if (!text) {
      continue;
    }
    const createdAt = normalizeCreatedAt(data.createdAt);
    if (!createdAt) {
      continue;
    }
    activeRows.push({ id: d.id, text, createdAt });
  }
  return { tombstonedIds, activeRows };
}

function tombstonedIdsFromDocs(docs: QueryDocumentSnapshot<DocumentData>[]): string[] {
  const ids: string[] = [];
  for (const d of docs) {
    if (isFirestoreDocumentTombstoned(d.data())) {
      ids.push(d.id);
    }
  }
  return ids;
}

/**
 * Subscribe to `users/{uid}/entries`: apply remote tombstones + ingest active docs (desktop → mobile).
 * No-op when Firebase sync is not configured.
 */
export function startMobileFirestoreIngest(onIngested: () => void): () => void {
  if (!isFirebaseSyncConfigured()) {
    return () => {};
  }

  const auth = getOrInitAuth();
  let unsubIngest: (() => void) | undefined;
  let unsubTombstones: (() => void) | undefined;

  const detachFirestoreListeners = () => {
    unsubIngest?.();
    unsubIngest = undefined;
    unsubTombstones?.();
    unsubTombstones = undefined;
  };

  const unsubAuth = onAuthStateChanged(auth, (user) => {
    detachFirestoreListeners();
    if (!user || user.isAnonymous) {
      return;
    }
    void flushSyncTombstoneOutbox();
    const db = getOrInitFirestore();
    const coll = collection(db, 'users', user.uid, 'entries');

    const qIngest = query(coll, orderBy('createdAt', 'desc'), limit(INGEST_PAGE_SIZE));
    unsubIngest = onSnapshot(
      qIngest,
      async (snap) => {
        const { tombstonedIds, activeRows } = partitionFirestoreSnapshotDocs(snap.docs);
        let changed = false;
        if (tombstonedIds.length > 0) {
          try {
            const removed = await applyRemoteTombstoneDeletes(tombstonedIds);
            if (removed > 0) {
              changed = true;
            }
          } catch (e) {
            if (__DEV__) {
              console.error('[ChinottoSync] tombstone apply failed', e);
            }
          }
        }
        if (activeRows.length > 0) {
          try {
            const inserted = await ingestRemoteFirestoreRows(activeRows);
            if (inserted > 0) {
              changed = true;
            }
          } catch (e) {
            if (__DEV__) {
              console.error('[ChinottoSync] ingest failed', e);
            }
          }
        }
        if (changed) {
          onIngested();
        }
        await flushSyncTombstoneOutbox();
      },
      (err) => {
        if (__DEV__) {
          console.error('[ChinottoSync] ingest snapshot error', err);
        }
      }
    );

    // `!= null` is ordered ascending by default; with `limit` that returns the *oldest* tombstones,
    // so new deletes never appear. Newest first so recent `deletedAt` is always in window.
    const qTombstones = query(
      coll,
      where('deletedAt', '!=', null),
      orderBy('deletedAt', 'desc'),
      limit(TOMBSTONE_QUERY_LIMIT)
    );
    unsubTombstones = onSnapshot(
      qTombstones,
      async (snap) => {
        const ids = tombstonedIdsFromDocs(snap.docs);
        try {
          const removed = await applyRemoteTombstoneDeletes(ids);
          if (removed > 0) {
            onIngested();
          }
        } catch (e) {
          if (__DEV__) {
            console.error('[ChinottoSync] tombstone apply failed', e);
          }
        }
        await flushSyncTombstoneOutbox();
      },
      (err) => {
        if (__DEV__) {
          console.error('[ChinottoSync] tombstone snapshot error', err);
        }
      }
    );
  });

  return () => {
    detachFirestoreListeners();
    unsubAuth();
  };
}
