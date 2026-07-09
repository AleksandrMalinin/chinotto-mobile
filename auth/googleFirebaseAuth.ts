import type { Auth, AuthCredential } from 'firebase/auth';
import { linkWithCredential, signInWithCredential } from 'firebase/auth';

import { SyncIdentityError } from './syncIdentity';

export type ApplyGoogleCredentialResult =
  | { kind: 'linked' }
  | { kind: 'signed_in' }
  | { kind: 'already_google' };

/**
 * Links Google to the current anonymous user, signs in fresh, or no-ops if Google is already linked.
 */
export async function applyGoogleCredentialToFirebase(
  auth: Auth,
  firebaseCredential: AuthCredential
): Promise<ApplyGoogleCredentialResult> {
  const user = auth.currentUser;

  if (user?.isAnonymous) {
    await linkWithCredential(user, firebaseCredential);
    return { kind: 'linked' };
  }

  if (!user) {
    await signInWithCredential(auth, firebaseCredential);
    return { kind: 'signed_in' };
  }

  const hasGoogle = user.providerData.some((p) => p.providerId === 'google.com');
  if (hasGoogle) {
    return { kind: 'already_google' };
  }

  throw new SyncIdentityError(
    'signed_in_other_provider',
    'Another sign-in is already active. Sign in with Google is not available for this session.'
  );
}
