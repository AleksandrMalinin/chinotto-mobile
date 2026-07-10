import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type CollectionReference,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import { parseFirestoreEntryTheme } from '../types/firestoreSyncTheme';
import type { EntryTheme } from '../types/entryTheme';
import type { FirestoreIngestEntryRow } from '../storage/entryRepository';

export function parseEntryThemeField(data: DocumentData): EntryTheme | null | undefined {
  if (!('theme' in data)) {
    return undefined;
  }
  if (data.theme === null) {
    return null;
  }
  return parseFirestoreEntryTheme(data.theme);
}

export function partitionUserThemeDocs(docs: QueryDocumentSnapshot<DocumentData>[]): {
  tombstonedIds: string[];
  activeRows: { id: string; label: string; sortOrder: number }[];
} {
  const tombstonedIds: string[] = [];
  const activeRows: { id: string; label: string; sortOrder: number }[] = [];
  for (const d of docs) {
    const data = d.data();
    if (data.deletedAt != null) {
      tombstonedIds.push(d.id);
      continue;
    }
    const label = typeof data.label === 'string' ? data.label.trim() : '';
    if (!label) {
      continue;
    }
    const sortOrder = typeof data.sortOrder === 'number' ? data.sortOrder : 0;
    activeRows.push({ id: d.id, label, sortOrder });
  }
  return { tombstonedIds, activeRows };
}

export type { FirestoreIngestEntryRow };

export const USER_THEME_QUERY_LIMIT = 100;

export function userThemesCollection(
  db: ReturnType<typeof import('./firebaseSync').getOrInitFirestore>,
  uid: string
): CollectionReference<DocumentData> {
  return collection(db, 'users', uid, 'user_themes');
}

export function userThemeIngestQuery(coll: CollectionReference<DocumentData>) {
  return query(coll, orderBy('updatedAt', 'desc'), limit(USER_THEME_QUERY_LIMIT));
}

export function userThemeTombstoneQuery(coll: CollectionReference<DocumentData>) {
  return query(
    coll,
    where('deletedAt', '!=', null),
    orderBy('deletedAt', 'desc'),
    limit(USER_THEME_QUERY_LIMIT)
  );
}
