/**
 * Sync + Chinotto Plus: remote sync is gated when the paywall feature is on and the user is not subscribed.
 */

import { isPaywallEnabled } from './paywallConfig';
import { getCachedIsSubscribed, isSubscriptionHydrated } from './subscriptionState';

/**
 * Whether the user may use cloud sync under current product rules.
 * When the paywall feature is off, everyone is treated as entitled (legacy behavior).
 */
export function isPremiumUser(): boolean {
  if (!isPaywallEnabled()) {
    return true;
  }
  if (!isSubscriptionHydrated()) {
    return false;
  }
  return getCachedIsSubscribed();
}

/**
 * When true, outbound/inbound Firestore sync must not run; local queue and tombstone outbox stay pending.
 */
export function isSyncBlockedByPaywall(): boolean {
  return isPaywallEnabled() && !isPremiumUser();
}
