import type { Auth, AuthCredential } from 'firebase/auth';
import { linkWithCredential } from 'firebase/auth';

import { SyncIdentityError } from './syncIdentity';

export type LinkOAuthProviderResult = 'linked' | 'already_linked';

/**
 * Links a second OAuth provider to the signed-in (non-anonymous) user — Settings flow.
 */
export async function linkOAuthProviderToCurrentUser(
  auth: Auth,
  firebaseCredential: AuthCredential,
  providerId: 'apple.com' | 'google.com'
): Promise<LinkOAuthProviderResult> {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) {
    throw new Error('Sign in before linking another provider.');
  }

  if (user.providerData.some((p) => p.providerId === providerId)) {
    return 'already_linked';
  }

  try {
    await linkWithCredential(user, firebaseCredential);
    return 'linked';
  } catch (e: unknown) {
    const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : '';
    if (code === 'auth/provider-already-linked') {
      return 'already_linked';
    }
    if (code === 'auth/credential-already-in-use') {
      throw new SyncIdentityError(
        'credential_in_use',
        'This sign-in is already used by another Chinotto cloud profile. Use that account on each device, or link from the device where you first enabled sync.'
      );
    }
    throw e;
  }
}
