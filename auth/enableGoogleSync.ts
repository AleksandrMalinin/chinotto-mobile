import { isFirebaseSyncConfigured } from '../sync/firebaseConfig';
import { getOrInitAuth } from '../sync/firebaseAuth';
import { applyGoogleCredentialToFirebase } from './googleFirebaseAuth';
import { createFirebaseGoogleCredential } from './googleSignInCredential';
import { SyncIdentityError } from './syncIdentity';

export { GoogleUserCanceledError } from './googleSignInCredential';

/**
 * Presents Google Sign-In and attaches the credential to Firebase (link if anonymous, else sign-in).
 */
export async function enableGoogleSyncWithFirebase(): Promise<void> {
  if (!isFirebaseSyncConfigured()) {
    throw new Error('Firebase sync is not configured');
  }

  const firebaseCredential = await createFirebaseGoogleCredential();
  const auth = getOrInitAuth();

  try {
    await applyGoogleCredentialToFirebase(auth, firebaseCredential);
  } catch (e: unknown) {
    const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : '';
    if (code === 'auth/credential-already-in-use') {
      throw new SyncIdentityError(
        'credential_in_use',
        'This Google account already has cloud data under another Firebase sign-in. This device keeps working locally. For one library everywhere, use the same Google account on each device; otherwise cloud data can stay split between accounts.'
      );
    }
    throw e;
  }
}
