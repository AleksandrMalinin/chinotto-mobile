jest.mock('../firebaseSync', () => ({
  firebasePushEntry: jest.fn(),
  ensureFirebaseAuthReady: jest.fn(() => Promise.resolve()),
}));

import { isFirebaseSyncConfigured } from '../firebaseConfig';
import { firebasePushEntry } from '../firebaseSync';
import { mockPushEntryToRemote } from '../syncEngine';
import { resolvePushEntryForSync } from '../pushEntryForSync';

describe('firebaseConfig', () => {
  type Key = 'EXPO_PUBLIC_FIREBASE_API_KEY' | 'EXPO_PUBLIC_FIREBASE_PROJECT_ID';
  const initial: Record<Key, string | undefined> = {
    EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  };

  function restoreEnv() {
    (['EXPO_PUBLIC_FIREBASE_API_KEY', 'EXPO_PUBLIC_FIREBASE_PROJECT_ID'] as const).forEach((k) => {
      const v = initial[k];
      if (v === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = v;
      }
    });
  }

  afterEach(() => {
    restoreEnv();
  });

  it('is false when API key or project id is missing', () => {
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY = 'k';
    delete process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
    expect(isFirebaseSyncConfigured()).toBe(false);

    delete process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = 'p';
    expect(isFirebaseSyncConfigured()).toBe(false);
  });

  it('is false when values are whitespace-only', () => {
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY = '  ';
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = 'proj';
    expect(isFirebaseSyncConfigured()).toBe(false);
  });

  it('is true when both API key and project id are non-empty', () => {
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY = 'key';
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = 'proj';
    expect(isFirebaseSyncConfigured()).toBe(true);
  });
});

describe('resolvePushEntryForSync', () => {
  type Key = 'EXPO_PUBLIC_FIREBASE_API_KEY' | 'EXPO_PUBLIC_FIREBASE_PROJECT_ID';
  const initial: Record<Key, string | undefined> = {
    EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  };

  function restoreEnv() {
    (['EXPO_PUBLIC_FIREBASE_API_KEY', 'EXPO_PUBLIC_FIREBASE_PROJECT_ID'] as const).forEach((k) => {
      const v = initial[k];
      if (v === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = v;
      }
    });
  }

  afterEach(() => {
    restoreEnv();
  });

  it('returns mock push when Firebase env is incomplete', () => {
    delete process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = 'p';
    expect(resolvePushEntryForSync()).toBe(mockPushEntryToRemote);

    process.env.EXPO_PUBLIC_FIREBASE_API_KEY = 'k';
    delete process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
    expect(resolvePushEntryForSync()).toBe(mockPushEntryToRemote);
  });

  it('returns firebase push when both required env vars are set', () => {
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY = 'key';
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = 'proj';
    expect(resolvePushEntryForSync()).toBe(firebasePushEntry);
  });
});
