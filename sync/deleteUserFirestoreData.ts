import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  writeBatch,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore';

import { getOrInitFirestore } from './firebaseSync';

const BATCH_MAX = 450;

async function commitDeleteRefs(db: Firestore, refs: DocumentReference[]): Promise<void> {
  if (refs.length === 0) {
    return;
  }
  const batch = writeBatch(db);
  for (const r of refs) {
    batch.delete(r);
  }
  await batch.commit();
}

/**
 * Deletes `users/{uid}/entries/*` in batches, then deletes `users/{uid}`.
 * Idempotent: missing docs are skipped when traversing snapshots.
 */
export async function deleteAllFirestoreDataForUid(uid: string): Promise<void> {
  const db = getOrInitFirestore();
  const entriesCol = collection(db, 'users', uid, 'entries');

  for (;;) {
    const snap = await getDocs(query(entriesCol, limit(BATCH_MAX)));
    if (snap.empty) {
      break;
    }
    await commitDeleteRefs(
      db,
      snap.docs.map((d) => d.ref)
    );
    if (snap.size < BATCH_MAX) {
      break;
    }
  }

  await deleteDoc(doc(db, 'users', uid));
}
