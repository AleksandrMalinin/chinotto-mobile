import { clearDesktopSyncSessionId } from '../linking/desktopSyncSessionStash';

import { clearPendingSyncQueue } from './syncQueue';
import { clearSyncTombstoneOutbox } from './tombstoneOutbox';

/**
 * Local-only cleanup after the Firebase account is gone: sync queues and desktop stash.
 * Does **not** touch SQLite `entries` or other capture data.
 */
export async function cleanupLocalSyncStateAfterAccountDeletion(): Promise<void> {
  clearDesktopSyncSessionId();
  await clearPendingSyncQueue();
  await clearSyncTombstoneOutbox();
}
