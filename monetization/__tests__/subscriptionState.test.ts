import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearLocalSyncPaywallFlags,
  getCachedHasSyncEntitlement,
  getCachedIsSubscribed,
  getCachedIsTrialActive,
  getSyncEntitlementSourcesDebug,
  loadSubscriptionState,
  persistSubscribed,
  PLUS_TRIAL_DURATION_MS,
  resetSubscriptionStateForTests,
  stubCompleteChinottoPlusPurchase,
} from '../subscriptionState';

describe('subscriptionState', () => {
  beforeEach(async () => {
    resetSubscriptionStateForTests();
    await AsyncStorage.clear();
  });

  it('hydrates paid subscription from storage', async () => {
    await AsyncStorage.setItem('@chinotto/plus_subscribed_v1', '1');
    await loadSubscriptionState();
    expect(getCachedIsSubscribed()).toBe(true);
    expect(getCachedHasSyncEntitlement()).toBe(true);
    expect(getCachedIsTrialActive()).toBe(false);
  });

  it('stub paywall action starts trial without paid flag', async () => {
    await stubCompleteChinottoPlusPurchase();
    expect(getCachedIsSubscribed()).toBe(false);
    expect(getCachedIsTrialActive()).toBe(true);
    expect(getCachedHasSyncEntitlement()).toBe(true);
    const trial = await AsyncStorage.getItem('@chinotto/plus_trial_started_at_v1');
    expect(trial).toBeTruthy();
    expect(await AsyncStorage.getItem('@chinotto/plus_subscribed_v1')).toBeNull();
  });

  it('expired trial drops entitlement until subscribed', async () => {
    const past = Date.now() - PLUS_TRIAL_DURATION_MS - 60_000;
    await AsyncStorage.setItem('@chinotto/plus_trial_started_at_v1', String(past));
    await loadSubscriptionState();
    expect(getCachedIsTrialActive()).toBe(false);
    expect(getCachedHasSyncEntitlement()).toBe(false);
  });

  it('clearLocalSyncPaywallFlags removes legacy + trial from storage and memory', async () => {
    await AsyncStorage.setItem('@chinotto/plus_subscribed_v1', '1');
    await AsyncStorage.setItem('@chinotto/plus_trial_started_at_v1', String(Date.now()));
    await loadSubscriptionState();
    expect(getCachedHasSyncEntitlement()).toBe(true);

    await clearLocalSyncPaywallFlags();

    expect(getCachedIsSubscribed()).toBe(false);
    expect(getCachedIsTrialActive()).toBe(false);
    expect(await AsyncStorage.getItem('@chinotto/plus_subscribed_v1')).toBeNull();
    expect(await AsyncStorage.getItem('@chinotto/plus_trial_started_at_v1')).toBeNull();
  });

  it('getSyncEntitlementSourcesDebug reflects local flags (RC leg mocked via cache reset)', async () => {
    await stubCompleteChinottoPlusPurchase();
    const d = getSyncEntitlementSourcesDebug();
    expect(d.localTrialActive).toBe(true);
    expect(d.legacySubscribed).toBe(false);
    expect(getCachedHasSyncEntitlement()).toBe(true);
  });

  it('paid subscription keeps entitlement after trial window', async () => {
    const past = Date.now() - PLUS_TRIAL_DURATION_MS - 60_000;
    await AsyncStorage.setItem('@chinotto/plus_trial_started_at_v1', String(past));
    await AsyncStorage.setItem('@chinotto/plus_subscribed_v1', '1');
    await loadSubscriptionState();
    expect(getCachedIsTrialActive()).toBe(false);
    expect(getCachedIsSubscribed()).toBe(true);
    expect(getCachedHasSyncEntitlement()).toBe(true);
  });
});
