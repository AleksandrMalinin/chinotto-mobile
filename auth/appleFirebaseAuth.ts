import type { Auth, AuthCredential, User } from 'firebase/auth';
import { linkWithCredential, signInWithCredential } from 'firebase/auth';

import { SyncIdentityError } from './syncIdentity';

export type ApplyAppleCredentialResult =
  | { kind: 'linked' }
  | { kind: 'signed_in' }
  | { kind: 'already_apple' };

/** @deprecated Use SyncIdentityError */
export { SyncIdentityError as AppleSyncIdentityError } from './syncIdentity';

/**
 * Links Apple to the current anonymous user, signs in fresh, or no-ops if Apple is already linked.
 * Preserves Firebase `uid` when upgrading anonymous → Apple (same namespace in Firestore).
 */
export async function applyAppleCredentialToFirebase(
  auth: Auth,
  firebaseCredential: AuthCredential
): Promise<ApplyAppleCredentialResult> {
  const user: User | null = auth.currentUser;

  if (user?.isAnonymous) {
    await linkWithCredential(user, firebaseCredential);
    return { kind: 'linked' };
  }

  if (!user) {
    await signInWithCredential(auth, firebaseCredential);
    return { kind: 'signed_in' };
  }

  const hasApple = user.providerData.some((p) => p.providerId === 'apple.com');
  if (hasApple) {
    return { kind: 'already_apple' };
  }

  throw new SyncIdentityError(
    'signed_in_other_provider',
    'Another sign-in is already active. Sign-in with Apple is not available for this session.'
  );
}

