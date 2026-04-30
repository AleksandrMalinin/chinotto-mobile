import { reauthenticateWithCredential } from 'firebase/auth';

import { getOrInitAuth } from '../sync/firebaseAuth';
import { createFirebaseAppleCredential } from './appleSignInCredential';

/**
 * Presents Sign in with Apple and reauthenticates the current Firebase user (e.g. before account deletion).
 */
export async function reauthenticateCurrentUserWithApple(): Promise<void> {
  const auth = getOrInitAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No signed-in user');
  }
  const credential = await createFirebaseAppleCredential();
  await reauthenticateWithCredential(user, credential);
}
