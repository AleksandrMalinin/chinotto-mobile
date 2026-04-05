const {
  assertEasPaywallHasProductionRevenueCatIosKey,
  parseEnableSyncPaywall,
} = require('../easRevenueCatEnvGuard.cjs');

describe('parseEnableSyncPaywall', () => {
  it('treats true/1/yes as on', () => {
    expect(parseEnableSyncPaywall('true')).toBe(true);
    expect(parseEnableSyncPaywall('1')).toBe(true);
    expect(parseEnableSyncPaywall('yes')).toBe(true);
  });
});

describe('assertEasPaywallHasProductionRevenueCatIosKey', () => {
  it('no-op when not an EAS build', () => {
    expect(() =>
      assertEasPaywallHasProductionRevenueCatIosKey({
        EXPO_PUBLIC_ENABLE_PAYWALL: 'true',
        EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: '',
      }),
    ).not.toThrow();
  });

  it('no-op when EAS but paywall off', () => {
    expect(() =>
      assertEasPaywallHasProductionRevenueCatIosKey({
        EAS_BUILD: 'true',
        EXPO_PUBLIC_ENABLE_PAYWALL: 'false',
        EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: '',
      }),
    ).not.toThrow();
  });

  it('throws when EAS + paywall on + missing key', () => {
    expect(() =>
      assertEasPaywallHasProductionRevenueCatIosKey({
        EAS_BUILD: 'true',
        EXPO_PUBLIC_ENABLE_PAYWALL: 'true',
        EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: '',
      }),
    ).toThrow(/EXPO_PUBLIC_REVENUECAT_IOS_API_KEY/);
  });

  it('throws when EAS + paywall on + test_* key', () => {
    expect(() =>
      assertEasPaywallHasProductionRevenueCatIosKey({
        EAS_BUILD: '1',
        EXPO_PUBLIC_ENABLE_PAYWALL: 'true',
        EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: 'test_foo',
      }),
    ).toThrow(/test_\*/);
  });

  it('passes when EAS + paywall on + appl_* key', () => {
    expect(() =>
      assertEasPaywallHasProductionRevenueCatIosKey({
        EAS_BUILD: 'true',
        EXPO_PUBLIC_ENABLE_PAYWALL: 'true',
        EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: 'appl_xxxxxxxx',
      }),
    ).not.toThrow();
  });
});
