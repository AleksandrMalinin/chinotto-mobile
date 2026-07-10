import type { Entry } from '../types/entry';
import type { PushEntryFn } from './syncEngine';
import { getEntryTheme } from '../storage/themeRepository';
import { isThemesEnabled } from '../storage/themeSettings';
import { isFirebaseSyncConfigured } from './firebaseConfig';
import { firebasePushEntry } from './firebaseSync';

async function pushEntrySyncUnavailable(): Promise<void> {
  throw new Error('[Sync] Firebase is not configured; cannot push sync entries.');
}

async function pushEntryWithTheme(entry: Entry): Promise<void> {
  const themesOn = await isThemesEnabled();
  const theme = themesOn ? await getEntryTheme(entry.id) : null;
  await firebasePushEntry(entry, themesOn ? theme : null);
}

/** Push implementation for `startBackgroundSync` / `processSyncQueue`. */
export function resolvePushEntryForSync(): PushEntryFn {
  return isFirebaseSyncConfigured() ? pushEntryWithTheme : pushEntrySyncUnavailable;
}
