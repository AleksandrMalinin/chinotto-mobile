import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import type { AuthCredential } from 'firebase/auth';
import { OAuthProvider } from 'firebase/auth';

const APPLE_REQUEST_CANCELED = 'ERR_REQUEST_CANCELED';

function randomRawNonce(): string {
  return `${Crypto.randomUUID()}-${Crypto.randomUUID()}`;
}

export class AppleUserCanceledError extends Error {
  constructor() {
    super('User canceled Apple sign-in');
    this.name = 'AppleUserCanceledError';
  }
}

/**
 * Presents Sign in with Apple and builds the Firebase `apple.com` credential (nonce-bound).
 * Caller applies via {@link import('firebase/auth').linkWithCredential}, {@link import('firebase/auth').signInWithCredential}, or {@link import('firebase/auth').reauthenticateWithCredential}.
 */
export async function createFirebaseAppleCredential(): Promise<AuthCredential> {
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
  return provider.credential({
    idToken,
    rawNonce,
  });
}
