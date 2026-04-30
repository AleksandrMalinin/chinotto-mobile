import { isFirebaseSyncConfigured } from '../sync/firebaseConfig';
import { getOrInitAuth } from '../sync/firebaseAuth';
import {
  AppleSyncIdentityError,
  applyAppleCredentialToFirebase,
} from './appleFirebaseAuth';
import { createFirebaseAppleCredential } from './appleSignInCredential';

export { AppleUserCanceledError } from './appleSignInCredential';

/**
 * Presents Sign in with Apple and attaches the credential to Firebase (link if anonymous, else sign-in).
 * Does not block capture; call from "Enable sync" only.
 */
export async function enableAppleSyncWithFirebase(): Promise<void> {
  if (!isFirebaseSyncConfigured()) {
    throw new Error('Firebase sync is not configured');
  }

  const firebaseCredential = await createFirebaseAppleCredential();

  const auth = getOrInitAuth();

  try {
    await applyAppleCredentialToFirebase(auth, firebaseCredential);
  } catch (e: unknown) {
    const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : '';
    if (code === 'auth/credential-already-in-use') {
      throw new AppleSyncIdentityError(
        'credential_in_use',
        'This Apple ID already has cloud data under another Firebase sign-in. This device keeps working locally. For one library everywhere, use the same Sign in with Apple on each device; otherwise cloud data can stay split between accounts.'
      );
    }
    throw e;
  }
}
