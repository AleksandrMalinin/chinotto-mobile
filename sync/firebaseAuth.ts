import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Auth } from 'firebase/auth';
import { getAuth } from 'firebase/auth';
import { Platform } from 'react-native';

import { getOrInitApp } from './firebaseApp';

let authSingleton: Auth | null = null;

export function firebaseAuthErrorCode(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err && typeof (err as { code: unknown }).code === 'string') {
    return (err as { code: string }).code;
  }
  return '';
}

/**
 * Returns the Firebase Auth instance for this app.
 * On native, uses AsyncStorage-backed persistence via @firebase/auth's React Native entry
 * so the session survives process restarts. `getAuth` from `firebase/auth` alone does not
 * enable that persistence on React Native.
 */
export function getOrInitAuth(): Auth {
  if (authSingleton) {
    return authSingleton;
  }

  if (__DEV__) {
    console.log('[ChinottoAuth] auth initialization (creating singleton)', { platform: Platform.OS });
  }

  const app = getOrInitApp();

  if (Platform.OS === 'web') {
    authSingleton = getAuth(app);
    return authSingleton;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports -- RN bundle path; Metro/Jest resolve from node_modules
  const nativeAuth = require('@firebase/auth/dist/rn/index.js') as {
    initializeAuth: (app: ReturnType<typeof getOrInitApp>, deps: { persistence: unknown }) => Auth;
    getAuth: (app: ReturnType<typeof getOrInitApp>) => Auth;
    getReactNativePersistence: (storage: typeof AsyncStorage) => unknown;
  };

  try {
    authSingleton = nativeAuth.initializeAuth(app, {
      persistence: nativeAuth.getReactNativePersistence(AsyncStorage),
    });
  } catch (e: unknown) {
    if (firebaseAuthErrorCode(e) === 'auth/already-initialized') {
      authSingleton = nativeAuth.getAuth(app);
    } else {
      throw e;
    }
  }

  return authSingleton;
}
