import type { Entry } from '../types/entry';
import { getPendingSyncItems, markSynced } from './syncQueue';
import { flushSyncTombstoneOutbox } from './tombstoneFlush';

export type PushEntryFn = (entry: Entry) => Promise<void>;

/** Placeholder “remote” push; replace with real networking later. */
export async function mockPushEntryToRemote(_entry: Entry): Promise<void> {
  // No-op: sync layer is best-effort; storage already persisted the entry.
}

let processLock = false;

/**
 * Drains pending queue items best-effort. Failed items stay pending for a later run (retry).
 *
 * Idempotency: remote ingest must dedupe by `Entry.id` (see docs/SYNC.md); retries may resend the same payload safely.
 */
export async function processSyncQueue(pushEntry: PushEntryFn = mockPushEntryToRemote): Promise<void> {
  if (processLock) {
    return;
  }
  processLock = true;
  try {
    const batchSize = 25;
    const items = await getPendingSyncItems(batchSize);
    for (const item of items) {
      try {
        await pushEntry(item.payload);
        await markSynced(item.id);
      } catch {
        // Keep pending; next tick / interval retries.
      }
    }
  } finally {
    processLock = false;
  }
}

export type BackgroundSyncHandle = { stop: () => void };

/**
 * Non-blocking periodic processing. Does not run work on the UI thread beyond scheduling.
 */
export function startBackgroundSync(options?: {
  intervalMs?: number;
  pushEntry?: PushEntryFn;
}): BackgroundSyncHandle {
  const intervalMs = options?.intervalMs ?? 15_000;
  const pushEntry = options?.pushEntry ?? mockPushEntryToRemote;

  const tick = () => {
    void (async () => {
      await processSyncQueue(pushEntry);
      await flushSyncTombstoneOutbox();
    })();
  };

  const id = setInterval(tick, intervalMs);

  tick();

  return {
    stop: () => clearInterval(id),
  };
}
