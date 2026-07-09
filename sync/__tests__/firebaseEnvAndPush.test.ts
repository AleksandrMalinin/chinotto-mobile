jest.mock('../firebaseSync', () => ({
  firebasePushEntry: jest.fn(),
  ensureFirebaseAuthReady: jest.fn(() => Promise.resolve()),
}));

jest.mock('../tombstoneFlush', () => ({
  flushSyncTombstoneOutbox: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../storage/themeRepository', () => ({
  getEntryTheme: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('../../storage/themeSettings', () => ({
  isThemesEnabled: jest.fn(() => Promise.resolve(true)),
}));

import { isFirebaseSyncConfigured } from '../firebaseConfig';
import { firebasePushEntry } from '../firebaseSync';
import { resolvePushEntryForSync } from '../pushEntryForSync';

describe('firebaseConfig', () => {
  type Key =
    | 'EXPO_PUBLIC_FIREBASE_API_KEY'
    | 'EXPO_PUBLIC_FIREBASE_PROJECT_ID'
    | 'EXPO_PUBLIC_FIREBASE_APP_ID';
  const initial: Record<Key, string | undefined> = {
    EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  };

  function restoreEnv() {
    ([
      'EXPO_PUBLIC_FIREBASE_API_KEY',
      'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
      'EXPO_PUBLIC_FIREBASE_APP_ID',
    ] as const).forEach((k) => {
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

  it('is false when API key, project id, or app id is missing', () => {
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY = 'k';
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID = 'a';
    delete process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
    expect(isFirebaseSyncConfigured()).toBe(false);

    delete process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = 'p';
    expect(isFirebaseSyncConfigured()).toBe(false);

    process.env.EXPO_PUBLIC_FIREBASE_API_KEY = 'k';
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = 'p';
    delete process.env.EXPO_PUBLIC_FIREBASE_APP_ID;
    expect(isFirebaseSyncConfigured()).toBe(false);
  });

  it('is false when values are whitespace-only', () => {
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY = '  ';
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = 'proj';
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID = 'app';
    expect(isFirebaseSyncConfigured()).toBe(false);
  });

  it('is true when API key, project id, and app id are non-empty', () => {
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY = 'key';
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = 'proj';
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID = 'app';
    expect(isFirebaseSyncConfigured()).toBe(true);
  });
});

describe('resolvePushEntryForSync', () => {
  type Key =
    | 'EXPO_PUBLIC_FIREBASE_API_KEY'
    | 'EXPO_PUBLIC_FIREBASE_PROJECT_ID'
    | 'EXPO_PUBLIC_FIREBASE_APP_ID';
  const initial: Record<Key, string | undefined> = {
    EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  };

  function restoreEnv() {
    ([
      'EXPO_PUBLIC_FIREBASE_API_KEY',
      'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
      'EXPO_PUBLIC_FIREBASE_APP_ID',
    ] as const).forEach((k) => {
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

  it('returns a failing push function when Firebase env is incomplete', async () => {
    delete process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = 'p';
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID = 'a';
    await expect(
      resolvePushEntryForSync()({ id: 'e1', text: 'x', createdAt: '2026-01-01T00:00:00.000Z' }),
    ).rejects.toThrow(/not configured/i);

    process.env.EXPO_PUBLIC_FIREBASE_API_KEY = 'k';
    delete process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
    await expect(
      resolvePushEntryForSync()({ id: 'e1', text: 'x', createdAt: '2026-01-01T00:00:00.000Z' }),
    ).rejects.toThrow(/not configured/i);
  });

  it('returns firebase push wrapper when required env vars are set', async () => {
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY = 'key';
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = 'proj';
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID = 'app';
    const push = resolvePushEntryForSync();
    await push({ id: 'e1', text: 'x', createdAt: '2026-01-01T00:00:00.000Z' });
    expect(jest.mocked(firebasePushEntry)).toHaveBeenCalledWith(
      { id: 'e1', text: 'x', createdAt: '2026-01-01T00:00:00.000Z' },
      null
    );
  });
});
