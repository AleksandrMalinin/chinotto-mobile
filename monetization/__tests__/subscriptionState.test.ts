import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getCachedIsSubscribed,
  loadSubscriptionState,
  persistSubscribed,
  resetSubscriptionStateForTests,
  stubCompleteChinottoPlusPurchase,
} from '../subscriptionState';

describe('subscriptionState', () => {
  beforeEach(async () => {
    resetSubscriptionStateForTests();
    await AsyncStorage.clear();
  });

  it('hydrates false then true after load', async () => {
    await AsyncStorage.setItem('@chinotto/plus_subscribed_v1', '1');
    await loadSubscriptionState();
    expect(getCachedIsSubscribed()).toBe(true);
  });

  it('stub purchase persists subscription', async () => {
    await stubCompleteChinottoPlusPurchase();
    expect(getCachedIsSubscribed()).toBe(true);
    const v = await AsyncStorage.getItem('@chinotto/plus_subscribed_v1');
    expect(v).toBe('1');
  });
});
