import type { AuthCredential } from 'firebase/auth';
import { GoogleAuthProvider } from 'firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

let configured = false;

function ensureGoogleSignInConfigured(): void {
  if (configured) {
    return;
  }
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  if (!webClientId) {
    throw new Error(
      'Google Sign-In is not configured (set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to the Firebase Web client ID).'
    );
  }
  GoogleSignin.configure({
    webClientId,
    offlineAccess: false,
  });
  configured = true;
}

export class GoogleUserCanceledError extends Error {
  constructor() {
    super('User canceled Google sign-in');
    this.name = 'GoogleUserCanceledError';
  }
}

/**
 * Presents Google Sign-In on Android and builds the Firebase `google.com` credential.
 */
export async function createFirebaseGoogleCredential(): Promise<AuthCredential> {
  ensureGoogleSignInConfigured();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    const idToken = response.data?.idToken;
    if (!idToken) {
      throw new Error('Google did not return an ID token');
    }
    return GoogleAuthProvider.credential(idToken);
  } catch (e: unknown) {
    const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : '';
    if (code === statusCodes.SIGN_IN_CANCELLED) {
      throw new GoogleUserCanceledError();
    }
    throw e;
  }
}
