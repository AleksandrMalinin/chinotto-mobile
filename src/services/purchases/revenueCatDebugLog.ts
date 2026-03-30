import type { CustomerInfo, PurchasesOfferings } from 'react-native-purchases';

import { warnIfActiveSubscriptionButMissingChinottoProEntitlement } from './entitlements';
import { getCustomerInfo, getOfferings } from './revenueCat';

export type RevenueCatDebugSnapshot = {
  context?: string;
  customerInfo: {
    activeEntitlementIds: string[];
    activeSubscriptions: string[];
    allPurchasedProductIdentifiers: string[];
    originalAppUserId: string;
  } | null;
  offerings: {
    currentOfferingId: string | null;
    allOfferingIds: string[];
    currentPackages: Array<{
      packageIdentifier: string;
      productIdentifier: string;
      priceString?: string;
    }>;
  } | null;
};

function buildSnapshot(
  info: CustomerInfo | null,
  offerings: PurchasesOfferings | null,
  context?: string
): RevenueCatDebugSnapshot {
  return {
    context,
    customerInfo:
      info == null
        ? null
        : {
            activeEntitlementIds: Object.keys(info.entitlements.active ?? {}),
            activeSubscriptions: [...(info.activeSubscriptions ?? [])],
            allPurchasedProductIdentifiers: [...(info.allPurchasedProductIdentifiers ?? [])],
            originalAppUserId: info.originalAppUserId,
          },
    offerings:
      offerings == null
        ? null
        : {
            currentOfferingId: offerings.current?.identifier ?? null,
            allOfferingIds: Object.keys(offerings.all ?? {}),
            currentPackages: (offerings.current?.availablePackages ?? []).map((p) => {
              const priceString = (p.product as { priceString?: string }).priceString;
              return {
                packageIdentifier: p.identifier,
                productIdentifier: p.product.identifier,
                ...(priceString != null && priceString !== '' ? { priceString } : {}),
              };
            }),
          },
  };
}

/**
 * Logs a structured snapshot of RevenueCat **subscriptions / entitlements** and **offerings / products**.
 * **Development only** — no-op in production builds.
 *
 * @param customerInfo — pass when already fetched to skip an extra `getCustomerInfo` call
 */
export async function logRevenueCatSubscriptionsAndProducts(
  customerInfo?: CustomerInfo | null,
  context?: string
): Promise<void> {
  if (!__DEV__) {
    return;
  }

  try {
    const [info, offs] = await Promise.all([
      customerInfo !== undefined ? Promise.resolve(customerInfo) : getCustomerInfo(),
      getOfferings(),
    ]);

    const snapshot = buildSnapshot(info, offs, context);
    console.log(`[RevenueCat][debug]${context != null ? ` ${context}` : ''}`, snapshot);
    warnIfActiveSubscriptionButMissingChinottoProEntitlement(info);
  } catch (err) {
    console.warn('[RevenueCat][debug] snapshot failed', err);
  }
}
