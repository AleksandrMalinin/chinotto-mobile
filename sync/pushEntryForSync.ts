import type { PushEntryFn } from './syncEngine';
import { isFirebaseSyncConfigured } from './firebaseConfig';
import { firebasePushEntry } from './firebaseSync';

async function pushEntrySyncUnavailable(): Promise<void> {
  throw new Error('[Sync] Firebase is not configured; cannot push sync entries.');
}

/** Push implementation for `startBackgroundSync` / `processSyncQueue`. */
export function resolvePushEntryForSync(): PushEntryFn {
  return isFirebaseSyncConfigured() ? firebasePushEntry : pushEntrySyncUnavailable;
}
