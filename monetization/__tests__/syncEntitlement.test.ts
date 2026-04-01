import AsyncStorage from '@react-native-async-storage/async-storage';

import { isPaywallEnabled } from '../paywallConfig';
import {
  loadSubscriptionState,
  persistSubscribed,
  resetSubscriptionStateForTests,
  stubCompleteChinottoPlusPurchase,
} from '../subscriptionState';
import { isPremiumUser, isSyncBlockedByPaywall } from '../syncEntitlement';

jest.mock('../paywallConfig', () => ({
  isPaywallEnabled: jest.fn(() => false),
}));

const mockPaywall = jest.mocked(isPaywallEnabled);

describe('syncEntitlement', () => {
  beforeEach(async () => {
    mockPaywall.mockReturnValue(false);
    resetSubscriptionStateForTests();
    await AsyncStorage.multiRemove([
      '@chinotto/plus_subscribed_v1',
      '@chinotto/plus_trial_started_at_v1',
    ]);
    await loadSubscriptionState();
  });

  it('treats everyone as premium when paywall feature is off', () => {
    expect(isPremiumUser()).toBe(true);
    expect(isSyncBlockedByPaywall()).toBe(false);
  });

  it('blocks sync when paywall is on and user is not subscribed after hydration', async () => {
    mockPaywall.mockReturnValue(true);
    await loadSubscriptionState();
    expect(isPremiumUser()).toBe(false);
    expect(isSyncBlockedByPaywall()).toBe(true);
  });

  it('allows sync when paywall is on and user is subscribed', async () => {
    mockPaywall.mockReturnValue(true);
    await persistSubscribed(true);
    expect(isPremiumUser()).toBe(true);
    expect(isSyncBlockedByPaywall()).toBe(false);
  });

  it('allows sync when paywall is on and user has active trial (stub)', async () => {
    mockPaywall.mockReturnValue(true);
    resetSubscriptionStateForTests();
    await stubCompleteChinottoPlusPurchase();
    expect(isPremiumUser()).toBe(true);
    expect(isSyncBlockedByPaywall()).toBe(false);
  });
});
