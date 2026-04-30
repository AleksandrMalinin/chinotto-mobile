import { deleteUser, signOut } from 'firebase/auth';

import { AppleUserCanceledError } from '../auth/appleSignInCredential';
import { reauthenticateCurrentUserWithApple } from '../auth/reauthenticateApple';
import { cleanupLocalSyncStateAfterAccountDeletion } from './accountDeletionCleanup';
import { deleteAllFirestoreDataForUid } from './deleteUserFirestoreData';
import { firebaseAuthErrorCode, getOrInitAuth } from './firebaseAuth';
import { isFirebaseSyncConfigured } from './firebaseConfig';

export type DeleteChinottoAccountFailure =
  | 'not_configured'
  | 'not_signed_in'
  | 'network'
  | 'unknown';

export class DeleteChinottoAccountError extends Error {
  constructor(
    public readonly failure: DeleteChinottoAccountFailure,
    message?: string
  ) {
    super(message ?? failure);
    this.name = 'DeleteChinottoAccountError';
  }
}

/** Firestore already cleared; UI must prompt with Apple's copy, then call {@link resumeChinottoAccountDeletionAfterReauth}. */
export class AccountDeletionNeedsRecentLogin extends Error {
  constructor() {
    super('AccountDeletionNeedsRecentLogin');
    this.name = 'AccountDeletionNeedsRecentLogin';
  }
}

function isLikelyNetworkError(err: unknown): boolean {
  const code = firebaseAuthErrorCode(err);
  if (
    code === 'auth/network-request-failed' ||
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    code === 'failed-precondition'
  ) {
    return true;
  }
  const msg = err instanceof Error ? err.message : String(err);
  return /network|offline|timed?\s*out|unavailable/i.test(msg);
}

async function finalizeDeletionAfterUserRemoved(): Promise<void> {
  await cleanupLocalSyncStateAfterAccountDeletion();
  const auth = getOrInitAuth();
  if (auth.currentUser) {
    await signOut(auth).catch(() => {});
  }
}

/**
 * Deletes Firestore data for the current non-anonymous user, then deletes the Firebase Auth user.
 * On `auth/requires-recent-login`, throws {@link AccountDeletionNeedsRecentLogin} after Firestore is already wiped.
 */
export async function deleteChinottoAccountForCurrentUser(): Promise<void> {
  if (!isFirebaseSyncConfigured()) {
    throw new DeleteChinottoAccountError('not_configured', 'Firebase sync is not configured');
  }
  const auth = getOrInitAuth();
  const user = auth.currentUser;
  if (!user || user.isAnonymous) {
    throw new DeleteChinottoAccountError('not_signed_in');
  }
  const uid = user.uid;

  try {
    await deleteAllFirestoreDataForUid(uid);
  } catch (e: unknown) {
    if (isLikelyNetworkError(e)) {
      throw new DeleteChinottoAccountError('network');
    }
    throw new DeleteChinottoAccountError('unknown', e instanceof Error ? e.message : undefined);
  }

  try {
    await deleteUser(user);
  } catch (e: unknown) {
    const code = firebaseAuthErrorCode(e);
    if (code === 'auth/requires-recent-login') {
      throw new AccountDeletionNeedsRecentLogin();
    }
    if (code === 'auth/user-not-found' || code === 'auth/invalid-user-token') {
      await signOut(auth).catch(() => {});
      await cleanupLocalSyncStateAfterAccountDeletion();
      return;
    }
    if (isLikelyNetworkError(e)) {
      throw new DeleteChinottoAccountError('network');
    }
    throw new DeleteChinottoAccountError('unknown', e instanceof Error ? e.message : undefined);
  }

  await finalizeDeletionAfterUserRemoved();
}

/**
 * After {@link AccountDeletionNeedsRecentLogin}: reauthenticate with Apple, delete the Auth user, clear local sync state.
 */
export async function resumeChinottoAccountDeletionAfterReauth(): Promise<void> {
  if (!isFirebaseSyncConfigured()) {
    throw new DeleteChinottoAccountError('not_configured', 'Firebase sync is not configured');
  }
  const auth = getOrInitAuth();
  const user = auth.currentUser;
  if (!user || user.isAnonymous) {
    await cleanupLocalSyncStateAfterAccountDeletion();
    return;
  }

  try {
    await reauthenticateCurrentUserWithApple();
  } catch (e: unknown) {
    if (e instanceof AppleUserCanceledError) {
      throw e;
    }
    if (isLikelyNetworkError(e)) {
      throw new DeleteChinottoAccountError('network');
    }
    throw new DeleteChinottoAccountError('unknown', e instanceof Error ? e.message : undefined);
  }

  const refreshed = auth.currentUser;
  if (!refreshed || refreshed.isAnonymous) {
    await cleanupLocalSyncStateAfterAccountDeletion();
    return;
  }

  try {
    await deleteUser(refreshed);
  } catch (e: unknown) {
    const code = firebaseAuthErrorCode(e);
    if (code === 'auth/user-not-found' || code === 'auth/invalid-user-token') {
      await signOut(auth).catch(() => {});
      await cleanupLocalSyncStateAfterAccountDeletion();
      return;
    }
    if (isLikelyNetworkError(e)) {
      throw new DeleteChinottoAccountError('network');
    }
    throw new DeleteChinottoAccountError('unknown', e instanceof Error ? e.message : undefined);
  }

  await finalizeDeletionAfterUserRemoved();
}
