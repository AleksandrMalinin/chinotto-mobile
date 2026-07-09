import { createFirebaseGoogleCredential } from './googleSignInCredential';
import { linkOAuthProviderToCurrentUser } from './linkOAuthProvider';
import { getOrInitAuth } from '../sync/firebaseAuth';
import { isFirebaseSyncConfigured } from '../sync/firebaseConfig';

export { GoogleUserCanceledError } from './googleSignInCredential';

export async function linkGoogleInSettings(): Promise<void> {
  if (!isFirebaseSyncConfigured()) {
    throw new Error('Firebase sync is not configured');
  }
  const credential = await createFirebaseGoogleCredential();
  await linkOAuthProviderToCurrentUser(getOrInitAuth(), credential, 'google.com');
}
