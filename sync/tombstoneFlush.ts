import { getOrInitAuth } from './firebaseAuth';
import { firebaseApplyTombstoneEntry } from './firebaseSync';
import { isFirebaseSyncConfigured } from './firebaseConfig';
import { clearFirestoreIngestSuppression } from './ingestSuppression';
import { listSyncTombstoneOutbox, removeSyncTombstoneOutbox } from './tombstoneOutbox';

/**
 * Flush durable tombstone outbox to Firestore (Phase 2). Best-effort; failures leave rows pending.
 */
export async function flushSyncTombstoneOutbox(): Promise<void> {
  if (!isFirebaseSyncConfigured()) {
    return;
  }
  const auth = getOrInitAuth();
  const user = auth.currentUser;
  if (!user || user.isAnonymous) {
    return;
  }
  const ids = await listSyncTombstoneOutbox();
  for (const entryId of ids) {
    try {
      await firebaseApplyTombstoneEntry(entryId);
      await removeSyncTombstoneOutbox(entryId);
      await clearFirestoreIngestSuppression(entryId);
    } catch (e: unknown) {
      if (__DEV__) {
        console.warn('[ChinottoSync] tombstone flush failed, will retry', entryId, e);
      }
    }
  }
}
