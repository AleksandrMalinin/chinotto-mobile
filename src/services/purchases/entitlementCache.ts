import type { CustomerInfo } from 'react-native-purchases';

import { hasChinottoPro } from './entitlements';

/**
 * In-memory mirror of RevenueCat entitlement for **non-React** call sites (sync engine, etc.).
 * Updated from {@link syncEntitlementCacheFromCustomerInfo} and the SDK customer-info listener.
 */
let chinottoProFromRevenueCat = false;

/** Whether `Chinotto Pro` is active per last known CustomerInfo (RevenueCat entitlements). */
export function getCachedHasChinottoProEntitlement(): boolean {
  return chinottoProFromRevenueCat;
}

/**
 * RevenueCat treats `entitlements.active` as the source of truth for active entitlements.
 */
export function syncEntitlementCacheFromCustomerInfo(info: CustomerInfo | null): void {
  if (info == null) {
    chinottoProFromRevenueCat = false;
    return;
  }
  chinottoProFromRevenueCat = hasChinottoPro(info);
}

/** Jest / isolated tests — reset module cache. */
export function resetRevenueCatEntitlementCacheForTests(): void {
  chinottoProFromRevenueCat = false;
}
