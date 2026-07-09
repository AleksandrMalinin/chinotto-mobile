import { deleteField, doc, serverTimestamp, setDoc } from 'firebase/firestore';

import { isSyncAccessBlocked } from '../monetization/syncAccessPolicy';
import { clearUserThemeIngestSuppression } from './themeIngestSuppression';
import { getOrInitAuth } from './firebaseAuth';
import { getOrInitFirestore } from './firebaseSync';
import { isFirebaseSyncConfigured } from './firebaseConfig';
import { listUserThemeOutbox, removeUserThemeOutbox } from './userThemeOutbox';

async function firebasePushUserThemeUpsert(
  themeId: string,
  label: string,
  sortOrder: number
): Promise<void> {
  const auth = getOrInitAuth();
  const user = auth.currentUser;
  if (!user || user.isAnonymous) {
    throw new Error('Firebase Auth has no user');
  }
  const db = getOrInitFirestore();
  const ref = doc(db, 'users', user.uid, 'user_themes', themeId);
  await setDoc(
    ref,
    {
      label,
      sortOrder,
      updatedAt: serverTimestamp(),
      deletedAt: deleteField(),
    },
    { merge: true }
  );
}

async function firebaseApplyUserThemeTombstone(themeId: string): Promise<void> {
  const auth = getOrInitAuth();
  const user = auth.currentUser;
  if (!user || user.isAnonymous) {
    throw new Error('Firebase Auth has no user');
  }
  const db = getOrInitFirestore();
  const ref = doc(db, 'users', user.uid, 'user_themes', themeId);
  await setDoc(ref, { deletedAt: serverTimestamp() }, { merge: true });
}

/** Flush durable user-theme outbox to Firestore. Best-effort; failures leave rows pending. */
export async function flushSyncUserThemeOutbox(): Promise<void> {
  if (isSyncAccessBlocked()) {
    return;
  }
  if (!isFirebaseSyncConfigured()) {
    return;
  }
  const auth = getOrInitAuth();
  const user = auth.currentUser;
  if (!user || user.isAnonymous) {
    return;
  }
  const rows = await listUserThemeOutbox();
  for (const row of rows) {
    try {
      if (row.op === 'tombstone') {
        await firebaseApplyUserThemeTombstone(row.themeId);
      } else {
        const label = row.label?.trim() ?? '';
        if (!label || row.sortOrder == null) {
          await removeUserThemeOutbox(row.themeId);
          continue;
        }
        await firebasePushUserThemeUpsert(row.themeId, label, row.sortOrder);
      }
      await removeUserThemeOutbox(row.themeId);
      await clearUserThemeIngestSuppression(row.themeId);
    } catch (e: unknown) {
      if (__DEV__) {
        console.warn('[ChinottoSync] user theme flush failed, will retry', row.themeId, e);
      }
    }
  }
}
