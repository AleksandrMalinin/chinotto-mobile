import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { OAuthProvider } from 'firebase/auth';

import { isFirebaseSyncConfigured } from '../sync/firebaseConfig';
import { getOrInitAuth } from '../sync/firebaseAuth';
import {
  AppleSyncIdentityError,
  applyAppleCredentialToFirebase,
} from './appleFirebaseAuth';

const APPLE_REQUEST_CANCELED = 'ERR_REQUEST_CANCELED';

function randomRawNonce(): string {
  return `${Crypto.randomUUID()}-${Crypto.randomUUID()}`;
}

/**
 * Presents Sign in with Apple and attaches the credential to Firebase (link if anonymous, else sign-in).
 * Does not block capture; call from "Enable sync" only.
 */
export async function enableAppleSyncWithFirebase(): Promise<void> {
  if (!isFirebaseSyncConfigured()) {
    throw new Error('Firebase sync is not configured');
  }

  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    throw new Error('Sign in with Apple is not available on this device');
  }

  const rawNonce = randomRawNonce();
  const nonceDigest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
    { encoding: Crypto.CryptoEncoding.HEX }
  );

  let apple: AppleAuthentication.AppleAuthenticationCredential;
  try {
    apple = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: nonceDigest,
    });
  } catch (e: unknown) {
    const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : '';
    if (code === APPLE_REQUEST_CANCELED) {
      throw new AppleUserCanceledError();
    }
    throw e;
  }

  const idToken = apple.identityToken;
  if (!idToken) {
    throw new Error('Apple did not return an identity token');
  }

  const provider = new OAuthProvider('apple.com');
  const firebaseCredential = provider.credential({
    idToken,
    rawNonce,
  });

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

export class AppleUserCanceledError extends Error {
  constructor() {
    super('User canceled Apple sign-in');
    this.name = 'AppleUserCanceledError';
  }
}
