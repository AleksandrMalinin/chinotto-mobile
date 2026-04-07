import Purchases, { type CustomerInfo, type PurchasesOfferings } from 'react-native-purchases';

import { syncEntitlementCacheFromCustomerInfo } from './entitlementCache';
import { warnIfActiveSubscriptionButMissingChinottoProEntitlement } from './entitlements';
import { isRevenueCatQuietMode } from './revenueCatQuiet';

/**
 * **`__DEV__` only.** Refreshes RevenueCat + {@link entitlementCache} so gating matches **current** StoreKit receipts.
 *
 * - **Custom app user id:** `Purchases.logOut()` → new anonymous id (RC’s supported reset).
 * - **Already anonymous:** `logOut` throws — we use {@link Purchases.invalidateCustomerInfoCache} +
 *   {@link Purchases.syncPurchasesForResult} so a cleared Xcode **Manage Transactions** receipt updates RC.
 *
 * Xcode **StoreKit → Manage Transactions** only clears the **local** receipt until RC receives a sync.
 */
export async function devRevenueCatLogOutAndRefreshEntitlementCache(): Promise<void> {
  if (!__DEV__) {
    return;
  }
  try {
    const anonymous = await Purchases.isAnonymous();
    let info: CustomerInfo;
    if (anonymous) {
      await Purchases.invalidateCustomerInfoCache();
      const synced = await Purchases.syncPurchasesForResult();
      info = synced.customerInfo;
    } else {
      info = await Purchases.logOut();
    }
    syncEntitlementCacheFromCustomerInfo(info);
    warnIfActiveSubscriptionButMissingChinottoProEntitlement(info);
  } catch (e) {
    if (!isRevenueCatQuietMode()) {
      console.warn('[RevenueCat] devRevenueCatLogOutAndRefreshEntitlementCache failed', e);
    }
  }
}

export { hasChinottoPro, hasEntitlement } from './entitlements';

/**
 * Fetches current CustomerInfo. Safe when SDK is not configured (e.g. Android without key) — returns null.
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

/**
 * Fetches offerings (current + all). Safe on errors — returns null.
 */
export async function getOfferings(): Promise<PurchasesOfferings | null> {
  try {
    return await Purchases.getOfferings();
  } catch {
    return null;
  }
}

/**
 * Restore purchases and refresh local entitlement cache from returned CustomerInfo.
 */
export async function restorePurchases(): Promise<CustomerInfo | null> {
  try {
    const info = await Purchases.restorePurchases();
    syncEntitlementCacheFromCustomerInfo(info);
    warnIfActiveSubscriptionButMissingChinottoProEntitlement(info);
    return info;
  } catch {
    return null;
  }
}

/**
 * Pull latest CustomerInfo from RevenueCat and sync {@link entitlementCache}.
 * Call after configure and whenever you need to refresh gating without a hook.
 */
export async function refreshEntitlementCacheFromRevenueCat(): Promise<CustomerInfo | null> {
  const info = await getCustomerInfo();
  syncEntitlementCacheFromCustomerInfo(info);
  warnIfActiveSubscriptionButMissingChinottoProEntitlement(info);
  return info;
}
