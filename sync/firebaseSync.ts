import {
  doc,
  initializeFirestore,
  memoryLocalCache,
  serverTimestamp,
  setDoc,
  type Firestore,
} from 'firebase/firestore';

import type { Entry } from '../types/entry';
import { isFirebaseSyncConfigured } from './firebaseConfig';
import { getOrInitApp } from './firebaseApp';
import { getOrInitAuth } from './firebaseAuth';

export { getOrInitApp } from './firebaseApp';

let firestoreSingleton: Firestore | null = null;

export function getOrInitFirestore(): Firestore {
  if (firestoreSingleton) {
    return firestoreSingleton;
  }
  const app = getOrInitApp();
  firestoreSingleton = initializeFirestore(app, { localCache: memoryLocalCache() });
  return firestoreSingleton;
}

/**
 * Idempotent Firestore write: `users/{uid}/entries/{entry.id}` with `{ text, createdAt, pinned }`.
 * Uses merge so retries and partial payloads do not strip `deletedAt` / other fields (Phase 2 + pin).
 * Requires a signed-in Firebase user (Sign in with Apple for stable sync). Queue stays pending until then.
 */
export async function firebasePushEntry(entry: Entry): Promise<void> {
  if (!isFirebaseSyncConfigured()) {
    throw new Error('Firebase sync is not configured');
  }
  const auth = getOrInitAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Firebase Auth has no user');
  }
  if (user.isAnonymous) {
    throw new Error('Enable sync with Apple to upload entries');
  }
  const uid = user.uid;
  const db = getOrInitFirestore();
  await setDoc(
    doc(db, 'users', uid, 'entries', entry.id),
    {
      text: entry.text,
      createdAt: entry.createdAt,
      pinned: entry.pinned === true,
    },
    { merge: true }
  );
}

/** Merge-only pin flag — same `pinned` boolean as desktop; does not touch `text` / `createdAt`. */
export async function firebaseMergeEntryPinned(entryId: string, pinned: boolean): Promise<void> {
  if (!isFirebaseSyncConfigured()) {
    throw new Error('Firebase sync is not configured');
  }
  const auth = getOrInitAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Firebase Auth has no user');
  }
  if (user.isAnonymous) {
    throw new Error('Enable sync with Apple to sync pin state');
  }
  const uid = user.uid;
  const db = getOrInitFirestore();
  await setDoc(doc(db, 'users', uid, 'entries', entryId), { pinned }, { merge: true });
}

/**
 * Phase 2: tombstone on Firestore. Uses `setDoc` + merge so the write succeeds whether or not the
 * doc exists yet (`updateDoc` fails with not-found on missing docs). Idempotent with merge.
 */
export async function firebaseApplyTombstoneEntry(entryId: string): Promise<void> {
  if (!isFirebaseSyncConfigured()) {
    throw new Error('Firebase sync is not configured');
  }
  const auth = getOrInitAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Firebase Auth has no user');
  }
  if (user.isAnonymous) {
    throw new Error('Enable sync with Apple to sync deletes');
  }
  const uid = user.uid;
  const db = getOrInitFirestore();
  const ref = doc(db, 'users', uid, 'entries', entryId);
  await setDoc(ref, { deletedAt: serverTimestamp() }, { merge: true });
}
