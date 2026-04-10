import { isPaywallEnabled } from './paywallConfig';
import { getCachedHasSyncEntitlement, isSubscriptionHydrated } from './subscriptionState';

/**
 * Whether the user may use cloud sync under current product rules.
 * When paywall feature is off, everyone is treated as entitled.
 */
export function hasSyncAccess(): boolean {
  if (!isPaywallEnabled()) {
    return true;
  }
  if (!isSubscriptionHydrated()) {
    return false;
  }
  return getCachedHasSyncEntitlement();
}

/** When true, outbound/inbound Firestore sync must not run. */
export function isSyncAccessBlocked(): boolean {
  return isPaywallEnabled() && !hasSyncAccess();
}

/**
 * **`__DEV__` / diagnostics:** why {@link hasSyncAccess} may be false (mirror writes `active: false`).
 */
export function getSyncAccessPolicyDebug(): {
  paywallEnabled: boolean;
  subscriptionHydrated: boolean;
  hasEntitlement: boolean;
  hasSyncAccess: boolean;
} {
  return {
    paywallEnabled: isPaywallEnabled(),
    subscriptionHydrated: isSubscriptionHydrated(),
    hasEntitlement: getCachedHasSyncEntitlement(),
    hasSyncAccess: hasSyncAccess(),
  };
}
