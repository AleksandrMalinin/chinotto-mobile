import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@chinotto/plus_subscribed_v1';

let memorySubscribed = false;
/** False until {@link loadSubscriptionState} finishes (or {@link persistSubscribed} runs). */
let subscriptionHydrated = false;

export function getCachedIsSubscribed(): boolean {
  return memorySubscribed;
}

export function isSubscriptionHydrated(): boolean {
  return subscriptionHydrated;
}

export async function loadSubscriptionState(): Promise<void> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    memorySubscribed = v === '1';
  } catch {
    memorySubscribed = false;
  } finally {
    subscriptionHydrated = true;
  }
}

export async function persistSubscribed(value: boolean): Promise<void> {
  memorySubscribed = value;
  subscriptionHydrated = true;
  try {
    if (value) {
      await AsyncStorage.setItem(KEY, '1');
    } else {
      await AsyncStorage.removeItem(KEY);
    }
  } catch {
    /* ignore */
  }
}

/** Stub until StoreKit / server entitlements exist. */
export async function stubCompleteChinottoPlusPurchase(): Promise<void> {
  await persistSubscribed(true);
}

/** Test-only reset between cases. */
export function resetSubscriptionStateForTests(): void {
  memorySubscribed = false;
  subscriptionHydrated = false;
}
