import { createFirebaseAppleCredential } from './appleSignInCredential';
import { linkOAuthProviderToCurrentUser } from './linkOAuthProvider';
import { getOrInitAuth } from '../sync/firebaseAuth';
import { isFirebaseSyncConfigured } from '../sync/firebaseConfig';

export { AppleUserCanceledError } from './appleSignInCredential';

export async function linkAppleInSettings(): Promise<void> {
  if (!isFirebaseSyncConfigured()) {
    throw new Error('Firebase sync is not configured');
  }
  const credential = await createFirebaseAppleCredential();
  await linkOAuthProviderToCurrentUser(getOrInitAuth(), credential, 'apple.com');
}
