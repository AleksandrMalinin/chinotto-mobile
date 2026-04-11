import type { CustomerInfo, PurchasesError, PurchasesPackage } from 'react-native-purchases';
import Purchases from 'react-native-purchases';

import { syncEntitlementCacheFromCustomerInfo } from './entitlementCache';
import { hasChinottoPro } from './entitlements';
import { logRevenueCatSubscriptionsAndProducts } from './revenueCatDebugLog';
import { getCustomerInfo } from './revenueCat';

export type PurchaseChinottoPackageResult =
  | {
      status: 'success';
      customerInfo: CustomerInfo;
      productIdentifier: string;
    }
  | { status: 'cancelled' }
  | { status: 'failed'; error: Error };

function isPurchasesError(e: unknown): e is PurchasesError {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    'message' in e &&
    typeof (e as PurchasesError).code === 'string'
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** RevenueCat may omit `Chinotto Pro` in the first `CustomerInfo` right after the App Store purchase completes (trial especially). */
const POST_PURCHASE_POLL_ATTEMPTS = 6;
const POST_PURCHASE_POLL_GAP_MS = 450;

/**
 * Sync receipt with RC and/or poll `getCustomerInfo` until entitlement appears or attempts exhausted.
 * Avoids a single `getCustomerInfo` that returns null/stale and clears the cache.
 */
async function resolveEntitlementAfterPurchase(firstInfo: CustomerInfo): Promise<CustomerInfo> {
  syncEntitlementCacheFromCustomerInfo(firstInfo);
  if (hasChinottoPro(firstInfo)) {
    return firstInfo;
  }

  let last: CustomerInfo = firstInfo;

  for (let attempt = 0; attempt < POST_PURCHASE_POLL_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await sleep(POST_PURCHASE_POLL_GAP_MS);
    }

    try {
      const syncResult = await Purchases.syncPurchasesForResult();
      last = syncResult.customerInfo;
      syncEntitlementCacheFromCustomerInfo(syncResult.customerInfo);
      if (hasChinottoPro(syncResult.customerInfo)) {
        return syncResult.customerInfo;
      }
    } catch {
      /* try getCustomerInfo below */
    }

    const next = await getCustomerInfo();
    if (next != null) {
      last = next;
      syncEntitlementCacheFromCustomerInfo(next);
      if (hasChinottoPro(next)) {
        return next;
      }
    }
  }

  syncEntitlementCacheFromCustomerInfo(last);
  return last;
}

/**
 * Purchase a package from the current offering. Updates local entitlement cache on success.
 * User cancel is **silent** (`cancelled` — no throw, log only if you choose).
 */
export async function purchaseChinottoPackage(
  rcPackage: PurchasesPackage
): Promise<PurchaseChinottoPackageResult> {
  try {
    const { customerInfo, productIdentifier } = await Purchases.purchasePackage(rcPackage);
    const resolved = await resolveEntitlementAfterPurchase(customerInfo);
    if (__DEV__) {
      void logRevenueCatSubscriptionsAndProducts(resolved, 'after-purchase');
    }
    return { status: 'success', customerInfo: resolved, productIdentifier };
  } catch (e: unknown) {
    if (isPurchasesError(e) && e.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return { status: 'cancelled' };
    }
    if (e instanceof Error) {
      return { status: 'failed', error: e };
    }
    return { status: 'failed', error: new Error(String(e)) };
  }
}
