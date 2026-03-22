import type { PushEntryFn } from './syncEngine';
import { mockPushEntryToRemote } from './syncEngine';
import { isFirebaseSyncConfigured } from './firebaseConfig';
import { firebasePushEntry } from './firebaseSync';

/** Push implementation for `startBackgroundSync` / `processSyncQueue`. */
export function resolvePushEntryForSync(): PushEntryFn {
  return isFirebaseSyncConfigured() ? firebasePushEntry : mockPushEntryToRemote;
}
