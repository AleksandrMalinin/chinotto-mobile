import { isSyncAccessBlocked } from '../monetization/syncAccessPolicy';
import { getEntryById } from '../storage/entryRepository';
import { getEntryTheme } from '../storage/themeRepository';
import { isThemesEnabled } from '../storage/themeSettings';
import { firebasePushEntry } from './firebaseSync';
import { isFirebaseSyncConfigured } from './firebaseConfig';

/**
 * Push current entry text + optional theme field after local theme assign/classify.
 * Best-effort; entry create/edit queue still covers text-only retries.
 */
export async function pushEntryThemeToRemote(entryId: string): Promise<void> {
  if (!isFirebaseSyncConfigured() || isSyncAccessBlocked()) {
    return;
  }
  if (!(await isThemesEnabled())) {
    return;
  }
  const entry = await getEntryById(entryId);
  if (entry == null) {
    return;
  }
  const theme = await getEntryTheme(entryId);
  await firebasePushEntry(entry, theme);
}
