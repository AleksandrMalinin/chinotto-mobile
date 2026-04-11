/**
 * Sync paywall **orchestration**: composes local sync-access policy ({@link getCachedHasSyncEntitlement})
 * with RevenueCat offerings + purchase APIs. Lives in `monetization/` so `src/services/purchases/` stays RC-only.
 */

import { type ChinottoPackageKind, CHINOTTO_PACKAGE_KIND_ORDER } from '../src/services/purchases/constants';
import type { ChinottoPaywallPackage } from '../src/services/purchases/offerings';
import { loadCurrentChinottoOffering } from '../src/services/purchases/offerings';
import { purchaseChinottoPackage } from '../src/services/purchases/purchasePackage';
import { refreshEntitlementCacheFromRevenueCat } from '../src/services/purchases/revenueCat';

import { getCachedHasSyncEntitlement } from './subscriptionState';

/**
 * Outcome of {@link openSyncPurchaseFlow} — call only from explicit “Enable sync” / paywall UI.
 * `already_has_sync_access` means {@link getCachedHasSyncEntitlement} is true (RC **Chinotto Pro**, local trial, or legacy flag) — not necessarily an App Store “subscription” in the narrow sense.
 */
export type SyncPurchaseFlowResult =
  | { kind: 'already_has_sync_access' }
  | { kind: 'purchased'; productIdentifier: string }
  /**
   * App Store purchase finished in the RevenueCat SDK but local sync gate is still false
   * (entitlement not active yet, or products not linked to **Chinotto Pro** in the RC dashboard).
   */
  | { kind: 'purchased_without_entitlement'; productIdentifier: string }
  | { kind: 'cancelled' }
  | {
      kind: 'unavailable';
      reason:
        | 'fetch_failed'
        | 'no_offerings'
        | 'no_current_offering'
        | 'no_packages'
        | 'package_kind_not_found';
    }
  | { kind: 'failed'; error: Error };

export type OpenSyncPurchaseFlowOptions = {
  packageKind?: ChinottoPackageKind;
  /**
   * When the paywall already fetched offerings (e.g. for prices), pass them here to avoid a second
   * `getOfferings` call on Continue.
   */
  preloadedPackages?: ChinottoPaywallPackage[];
};

/**
 * Choose a package for checkout: explicit `preferredKind` if present, else prefer yearly → monthly → lifetime, else first row.
 */
export function pickChinottoPackageForPurchase(
  packages: ChinottoPaywallPackage[],
  preferredKind?: ChinottoPackageKind | null
): ChinottoPaywallPackage | null {
  if (packages.length === 0) {
    return null;
  }
  if (preferredKind != null) {
    const match = packages.find((p) => p.kind === preferredKind);
    if (match != null) {
      return match;
    }
  }
  const preference: ChinottoPackageKind[] = ['yearly', 'monthly', 'lifetime'];
  for (const k of preference) {
    const m = packages.find((p) => p.kind === k);
    if (m != null) {
      return m;
    }
  }
  return packages[0] ?? null;
}

/** Stable UI order for plan chips (monthly → yearly → lifetime). */
export const CHINOTTO_PLAN_KINDS_UI_ORDER = CHINOTTO_PACKAGE_KIND_ORDER;

/**
 * RevenueCat-backed sync purchase entry: call **only** when the user explicitly opts into paid sync.
 * Does not show UI. Never throws.
 */
export async function openSyncPurchaseFlow(
  options?: OpenSyncPurchaseFlowOptions
): Promise<SyncPurchaseFlowResult> {
  if (getCachedHasSyncEntitlement()) {
    return { kind: 'already_has_sync_access' };
  }

  try {
    await refreshEntitlementCacheFromRevenueCat();
  } catch {
    /* ignore — continue */
  }

  if (getCachedHasSyncEntitlement()) {
    return { kind: 'already_has_sync_access' };
  }

  let packages: ChinottoPaywallPackage[];
  if (options?.preloadedPackages != null && options.preloadedPackages.length > 0) {
    packages = options.preloadedPackages;
  } else {
    const offering = await loadCurrentChinottoOffering();
    if (!offering.ok) {
      return { kind: 'unavailable', reason: offering.reason };
    }
    if (offering.packages.length === 0) {
      return { kind: 'unavailable', reason: 'no_packages' };
    }
    packages = offering.packages;
  }

  const chosen = pickChinottoPackageForPurchase(packages, options?.packageKind ?? null);
  if (chosen == null) {
    return { kind: 'unavailable', reason: 'package_kind_not_found' };
  }

  const purchase = await purchaseChinottoPackage(chosen.rcPackage);
  if (purchase.status === 'cancelled') {
    return { kind: 'cancelled' };
  }
  if (purchase.status === 'failed') {
    return { kind: 'failed', error: purchase.error };
  }

  if (!getCachedHasSyncEntitlement()) {
    return {
      kind: 'purchased_without_entitlement',
      productIdentifier: purchase.productIdentifier,
    };
  }

  return { kind: 'purchased', productIdentifier: purchase.productIdentifier };
}
