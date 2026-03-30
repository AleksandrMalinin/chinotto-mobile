import { clearLocalSyncPaywallFlags } from '../monetization/subscriptionState';
import { devRevenueCatLogOutAndRefreshEntitlementCache } from '../src/services/purchases/revenueCat';

/**
 * **`__DEV__` + iOS only (caller).** One-shot QA: new RevenueCat anonymous user + clear legacy/trial flags,
 * so **Enable sync** can show the plan picker again after StoreKit transactions were cleared in Xcode.
 */
export async function resetPaywallForPurchaseTesting(): Promise<void> {
  if (!__DEV__) {
    return;
  }
  await devRevenueCatLogOutAndRefreshEntitlementCache();
  await clearLocalSyncPaywallFlags();
}
