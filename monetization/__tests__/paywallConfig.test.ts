const expoConstantsState = { enableSyncPaywall: false };

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        get enableSyncPaywall() {
          return expoConstantsState.enableSyncPaywall;
        },
      },
    },
  },
}));

describe('isPaywallEnabled', () => {
  const key = 'EXPO_PUBLIC_ENABLE_PAYWALL';
  const prev = process.env[key];

  afterEach(() => {
    expoConstantsState.enableSyncPaywall = false;
    if (prev === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = prev;
    }
    jest.resetModules();
  });

  function load(): { isPaywallEnabled: () => boolean } {
    return require('../paywallConfig') as typeof import('../paywallConfig');
  }

  it('is false when unset and extra is false', () => {
    delete process.env[key];
    expoConstantsState.enableSyncPaywall = false;
    expect(load().isPaywallEnabled()).toBe(false);
  });

  it('accepts true, 1, yes from process.env (case-insensitive, trimmed)', () => {
    expoConstantsState.enableSyncPaywall = false;
    for (const v of ['true', 'TRUE', ' 1 ', 'yes', 'Yes']) {
      process.env[key] = v;
      expect(load().isPaywallEnabled()).toBe(true);
    }
  });

  it('is true from extra.enableSyncPaywall when env is unset', () => {
    delete process.env[key];
    expoConstantsState.enableSyncPaywall = true;
    expect(load().isPaywallEnabled()).toBe(true);
  });

  it('is false for other env strings even if extra is false', () => {
    process.env[key] = 'false';
    expoConstantsState.enableSyncPaywall = false;
    expect(load().isPaywallEnabled()).toBe(false);
  });
});
