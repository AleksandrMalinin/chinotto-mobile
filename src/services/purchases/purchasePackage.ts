import type { CustomerInfo, PurchasesError, PurchasesPackage } from 'react-native-purchases';
import Purchases from 'react-native-purchases';

import { syncEntitlementCacheFromCustomerInfo } from './entitlementCache';
import { logRevenueCatSubscriptionsAndProducts } from './revenueCatDebugLog';
import { refreshEntitlementCacheFromRevenueCat } from './revenueCat';

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

/**
 * Purchase a package from the current offering. Updates local entitlement cache on success.
 * User cancel is **silent** (`cancelled` — no throw, log only if you choose).
 */
export async function purchaseChinottoPackage(
  rcPackage: PurchasesPackage
): Promise<PurchaseChinottoPackageResult> {
  try {
    const { customerInfo, productIdentifier } = await Purchases.purchasePackage(rcPackage);
    syncEntitlementCacheFromCustomerInfo(customerInfo);
    const refreshed = await refreshEntitlementCacheFromRevenueCat();
    if (__DEV__) {
      void logRevenueCatSubscriptionsAndProducts(refreshed ?? customerInfo, 'after-purchase');
    }
    return { status: 'success', customerInfo, productIdentifier };
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
