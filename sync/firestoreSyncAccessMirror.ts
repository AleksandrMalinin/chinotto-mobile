import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

import { getSyncAccessPolicyDebug, hasSyncAccess } from '../monetization/syncAccessPolicy';
import { isValidDesktopSyncSessionId } from '../linking/syncDeepLink';
import { clearDesktopSyncSessionId, peekDesktopSyncSessionId } from '../linking/desktopSyncSessionStash';

import { isFirebaseSyncConfigured } from './firebaseConfig';
import { getOrInitAuth } from './firebaseAuth';
import { getOrInitFirestore } from './firebaseSync';

/**
 * Writes cross-device sync-access state for the signed-in Firebase user:
 * - `users/{uid}.chinottoSyncAccess` — desktop reads after Sign in with Apple (same Apple → same uid).
 * - `sync_desktop_sessions/{ds}` when `ds` was stashed from the desktop QR — unauthenticated desktop listener.
 *   Written in the same pass as the user doc, **after** Sign in with Apple on the device (mirror no-ops without a non-anonymous user; purchase-before-Apple does not unlock the desktop gate).
 *
 * Call after confirmed RevenueCat entitlement changes and after Apple link (non-blocking).
 * No-op if Firebase is off, user is missing/anonymous, or sync access is blocked.
 */
export async function mirrorChinottoSyncAccessToFirestore(options?: {
  desktopSessionId?: string | null;
  /**
   * Before Firebase **sign-out** (e.g. user taps **Stop syncing**): write `active: false` even if
   * entitlement is still true, so desktop can show “not synced” without waiting for subscription loss.
   */
  forceInactive?: boolean;
}): Promise<void> {
  if (!isFirebaseSyncConfigured()) {
    return;
  }
  const auth = getOrInitAuth();
  const user = auth.currentUser;
  if (!user || user.isAnonymous) {
    return;
  }
  const active = options?.forceInactive === true ? false : hasSyncAccess();
  if (__DEV__ && !active && !options?.forceInactive) {
    console.warn('[chinotto sync] mirror: hasSyncAccess() is false — check paywall + subscription hydration + entitlement', {
      ...getSyncAccessPolicyDebug(),
      uid: user.uid,
    });
  }
  const db = getOrInitFirestore();
  const uid = user.uid;

  try {
    await setDoc(
      doc(db, 'users', uid),
      {
        chinottoSyncAccess: {
          active,
          updatedAt: serverTimestamp(),
        },
      },
      { merge: true }
    );
  } catch (e) {
    if (__DEV__) {
      console.warn('[chinotto sync] mirror user chinottoSyncAccess failed', e);
    }
    return;
  }

  if (!active) {
    return;
  }

  const ds = (options?.desktopSessionId ?? peekDesktopSyncSessionId())?.trim() ?? '';
  if (!isValidDesktopSyncSessionId(ds)) {
    return;
  }

  try {
    await setDoc(
      doc(db, 'sync_desktop_sessions', ds),
      {
        unlocked: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    clearDesktopSyncSessionId();
  } catch (e) {
    if (__DEV__) {
      console.warn('[chinotto sync] mirror desktop session gate failed', ds, e);
    }
  }
}
