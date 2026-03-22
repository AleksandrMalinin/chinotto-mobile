import type { Auth, AuthCredential, User } from 'firebase/auth';
import { linkWithCredential, signInWithCredential } from 'firebase/auth';

export type ApplyAppleCredentialResult =
  | { kind: 'linked' }
  | { kind: 'signed_in' }
  | { kind: 'already_apple' };

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

  throw new AppleSyncIdentityError(
    'signed_in_non_apple',
    'Another sign-in is already active. Sign-in with Apple is not available for this session.'
  );
}

export class AppleSyncIdentityError extends Error {
  constructor(
    public readonly code: 'signed_in_non_apple' | 'credential_in_use',
    message: string
  ) {
    super(message);
    this.name = 'AppleSyncIdentityError';
  }
}
