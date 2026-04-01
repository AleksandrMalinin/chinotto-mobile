import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getCachedHasChinottoProEntitlement,
  resetRevenueCatEntitlementCacheForTests,
} from '../src/services/purchases/entitlementCache';
import { refreshEntitlementCacheFromRevenueCat } from '../src/services/purchases/revenueCat';

const KEY_SUBSCRIBED = '@chinotto/plus_subscribed_v1';
/** Unix ms when the user started the Plus trial (stub or StoreKit later). */
const KEY_TRIAL_STARTED_AT = '@chinotto/plus_trial_started_at_v1';

/** Seven-day trial window for sync (stub until StoreKit). */
export const PLUS_TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

let memorySubscribed = false;
let memoryTrialStartedAtMs: number | null = null;
/** False until {@link loadSubscriptionState} finishes (or {@link persistSubscribed} / trial stub runs). */
let subscriptionHydrated = false;

/** Paid subscription only (not trial). */
export function getCachedIsSubscribed(): boolean {
  return memorySubscribed;
}

/** True while the 7-day trial is active (stub clock: device time). */
export function getCachedIsTrialActive(): boolean {
  if (memoryTrialStartedAtMs == null) {
    return false;
  }
  return Date.now() - memoryTrialStartedAtMs < PLUS_TRIAL_DURATION_MS;
}

/**
 * Sync / Firestore entitlement: local stub (trial / legacy flag) **or** RevenueCat `Chinotto Pro`.
 * RevenueCat cache is updated at app bootstrap and via the SDK customer-info listener (`initRevenueCat`).
 * Paywall orchestration treats this as “already has sync access” (see `already_has_sync_access` in `monetization/syncPurchaseFlow.ts`).
 */
export function getCachedHasSyncEntitlement(): boolean {
  return (
    memorySubscribed || getCachedIsTrialActive() || getCachedHasChinottoProEntitlement()
  );
}

/**
 * Which local/RC flags contribute to {@link getCachedHasSyncEntitlement} — for `__DEV__` diagnostics only.
 */
export function getSyncEntitlementSourcesDebug(): {
  legacySubscribed: boolean;
  localTrialActive: boolean;
  revenueCatChinottoPro: boolean;
} {
  return {
    legacySubscribed: getCachedIsSubscribed(),
    localTrialActive: getCachedIsTrialActive(),
    revenueCatChinottoPro: getCachedHasChinottoProEntitlement(),
  };
}

export function isSubscriptionHydrated(): boolean {
  return subscriptionHydrated;
}

function parseTrialMs(raw: string | null): number | null {
  if (raw == null || raw === '') {
    return null;
  }
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

export async function loadSubscriptionState(): Promise<void> {
  try {
    const sub = await AsyncStorage.getItem(KEY_SUBSCRIBED);
    memorySubscribed = sub === '1';
    memoryTrialStartedAtMs = parseTrialMs(await AsyncStorage.getItem(KEY_TRIAL_STARTED_AT));
  } catch {
    memorySubscribed = false;
    memoryTrialStartedAtMs = null;
  } finally {
    subscriptionHydrated = true;
  }
}

export async function persistSubscribed(value: boolean): Promise<void> {
  memorySubscribed = value;
  subscriptionHydrated = true;
  try {
    if (value) {
      await AsyncStorage.setItem(KEY_SUBSCRIBED, '1');
    } else {
      await AsyncStorage.removeItem(KEY_SUBSCRIBED);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Stub for the paywall primary action: starts a 7-day trial (persists start time).
 * Real build: replace with StoreKit / server verification; paid subs use {@link persistSubscribed}.
 */
/**
 * Removes **device-local** paywall bypass flags (legacy “subscribed” + 7-day trial timestamps).
 * Does **not** change Apple ID, Firebase, or RevenueCat purchases — only `@chinotto/plus_*` AsyncStorage keys.
 * Afterward, refreshes the RC entitlement mirror from the SDK so gating matches the store.
 *
 * **`__DEV__`:** exposed from the logo long-press dev menu. Use when `legacySubscribed` or `localTrialActive`
 * blocks the paywall during QA.
 */
export async function clearLocalSyncPaywallFlags(): Promise<void> {
  memorySubscribed = false;
  memoryTrialStartedAtMs = null;
  subscriptionHydrated = true;
  try {
    await AsyncStorage.multiRemove([KEY_SUBSCRIBED, KEY_TRIAL_STARTED_AT]);
  } catch {
    /* ignore */
  }
  await refreshEntitlementCacheFromRevenueCat();
}

export async function stubCompleteChinottoPlusPurchase(): Promise<void> {
  const now = Date.now();
  memoryTrialStartedAtMs = now;
  subscriptionHydrated = true;
  try {
    await AsyncStorage.setItem(KEY_TRIAL_STARTED_AT, String(now));
  } catch {
    /* ignore */
  }
}

/** Test-only reset between cases. */
export function resetSubscriptionStateForTests(): void {
  memorySubscribed = false;
  memoryTrialStartedAtMs = null;
  subscriptionHydrated = false;
  resetRevenueCatEntitlementCacheForTests();
}
