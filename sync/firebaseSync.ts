import { doc, initializeFirestore, memoryLocalCache, setDoc, type Firestore } from 'firebase/firestore';

import type { Entry } from '../types/entry';
import { isFirebaseSyncConfigured } from './firebaseConfig';
import { getOrInitApp } from './firebaseApp';
import { getOrInitAuth } from './firebaseAuth';

export { getOrInitApp } from './firebaseApp';

let firestoreSingleton: Firestore | null = null;

function getOrInitFirestore(): Firestore {
  if (firestoreSingleton) {
    return firestoreSingleton;
  }
  const app = getOrInitApp();
  firestoreSingleton = initializeFirestore(app, { localCache: memoryLocalCache() });
  return firestoreSingleton;
}

/**
 * Idempotent Firestore write: `users/{uid}/entries/{entry.id}` with `{ text, createdAt }`.
 * Requires a signed-in Firebase user (Sign in with Apple for stable sync). Queue stays pending until then.
 * Retries are safe if remote dedupes by document id (see docs/SYNC.md).
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
  await setDoc(doc(db, 'users', uid, 'entries', entry.id), {
    text: entry.text,
    createdAt: entry.createdAt,
  });
}
