import type { CustomerInfo } from 'react-native-purchases';

import { CHINOTTO_PRO_ENTITLEMENT_ID } from './constants';

/**
 * RevenueCat: use **entitlements** as source of truth — not raw product ids.
 * Active entitlements live under `customerInfo.entitlements.active`.
 */
export function hasEntitlement(info: CustomerInfo | null, entitlementId: string): boolean {
  if (info == null) {
    return false;
  }
  return info.entitlements.active[entitlementId] != null;
}

/** Whether the user has active access via dashboard entitlement `Chinotto Pro`. */
export function hasChinottoPro(customerInfo: CustomerInfo | null): boolean {
  return hasEntitlement(customerInfo, CHINOTTO_PRO_ENTITLEMENT_ID);
}

/**
 * **`__DEV__` only.** If StoreKit shows an active subscription but `entitlements.active` has no **Chinotto Pro**,
 * the app will keep showing the paywall — gating uses entitlements, not `activeSubscriptions` alone.
 * Usually means products are not attached to the **Chinotto Pro** entitlement in the RevenueCat dashboard.
 */
export function warnIfActiveSubscriptionButMissingChinottoProEntitlement(info: CustomerInfo | null): void {
  if (!__DEV__ || info == null) {
    return;
  }
  if (hasChinottoPro(info)) {
    return;
  }
  const subs = info.activeSubscriptions ?? [];
  if (subs.length === 0) {
    return;
  }
  console.warn(
    '[Chinotto][RevenueCat] You have active subscription product(s) but **Chinotto Pro** is not in entitlements.active — the paywall will stay until this is fixed.',
    '\n  activeSubscriptions:',
    subs,
    '\n  entitlements.active keys:',
    Object.keys(info.entitlements.active ?? {}),
    '\n  → RevenueCat → Product → attach to entitlement **Chinotto Pro** (exact name). See docs/billing/revenuecat-dashboard.md.'
  );
}
