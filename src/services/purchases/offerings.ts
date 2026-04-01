import { Platform } from 'react-native';
import Purchases, {
  INTRO_ELIGIBILITY_STATUS,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';

import { type ChinottoPackageKind } from './constants';
import { inferChinottoPackageKind, sortChinottoPackages } from './chinottoPackages';
import { getOfferings } from './revenueCat';

/**
 * One row the UI can render: stable `kind` + native `PurchasesPackage` for purchase APIs.
 */
export type ChinottoPaywallPackage = {
  kind: ChinottoPackageKind;
  /** RevenueCat package — pass to {@link purchaseChinottoPackage}. */
  rcPackage: PurchasesPackage;
  storeProductId: string;
  /** Localized price from StoreKit (e.g. `$4.99`) when the store returned product metadata. */
  priceString?: string;
  /**
   * Introductory offer metadata from StoreKit/RevenueCat when present.
   * Example (iOS): free trial has `introPriceString` like `$0.00`, plus cycles + period unit.
   */
  introPriceString?: string;
  introCycles?: number;
  introPeriodUnit?: string;
  introIsFreeTrial?: boolean;
  /**
   * iOS: `product.introPrice` was empty but intro eligibility is **eligible** — show generic trial copy only.
   */
  introTrialEligibleUndisclosed?: boolean;
};

function looksLikeZeroOrFree(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  const v = value.trim().toLowerCase();
  if (v === '') {
    return false;
  }
  if (v.includes('free')) {
    return true;
  }
  const normalized = v.replace(/[^\d.,-]/g, '').replace(',', '.');
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) && n === 0;
}

function extractIntroMeta(product: unknown): {
  introPriceString?: string;
  introCycles?: number;
  introPeriodUnit?: string;
  introIsFreeTrial?: boolean;
} {
  const p = (typeof product === 'object' && product != null ? product : {}) as {
    introPrice?: unknown;
    discounts?: unknown;
  };
  const intro = (typeof p.introPrice === 'object' && p.introPrice != null
    ? p.introPrice
    : null) as
    | {
        priceString?: unknown;
        cycles?: unknown;
        periodNumberOfUnits?: unknown;
        periodUnit?: unknown;
        paymentMode?: unknown;
      }
    | null;
  const discounts = Array.isArray(p.discounts)
    ? (p.discounts as Array<{
        priceString?: unknown;
        cycles?: unknown;
        periodNumberOfUnits?: unknown;
        periodUnit?: unknown;
        paymentMode?: unknown;
      }>)
    : [];

  const fromIntroOrDiscount = intro ?? discounts[0] ?? null;
  const discountFreeTrial = discounts.find((d) => {
    const mode = typeof d.paymentMode === 'string' ? d.paymentMode.toLowerCase() : '';
    return mode.includes('free_trial') || mode.includes('freetrial');
  });
  const candidate = discountFreeTrial ?? fromIntroOrDiscount;
  if (candidate == null) {
    return {};
  }

  const introPriceString =
    typeof candidate.priceString === 'string' && candidate.priceString.trim() !== ''
      ? candidate.priceString
      : undefined;
  const introCyclesFromCycles =
    typeof candidate.cycles === 'number' && Number.isFinite(candidate.cycles)
      ? candidate.cycles
      : undefined;
  const introCyclesFromPeriodNumber =
    typeof candidate.periodNumberOfUnits === 'number' && Number.isFinite(candidate.periodNumberOfUnits)
      ? candidate.periodNumberOfUnits
      : undefined;
  const introCycles = introCyclesFromCycles ?? introCyclesFromPeriodNumber;
  const introPeriodUnit =
    typeof candidate.periodUnit === 'string' && candidate.periodUnit.trim() !== ''
      ? candidate.periodUnit
      : undefined;
  const mode = typeof candidate.paymentMode === 'string' ? candidate.paymentMode.toLowerCase() : '';
  const introIsFreeTrial =
    mode.includes('free_trial') || mode.includes('freetrial') || looksLikeZeroOrFree(introPriceString);

  return {
    ...(introPriceString != null ? { introPriceString } : {}),
    ...(introCycles != null ? { introCycles } : {}),
    ...(introPeriodUnit != null ? { introPeriodUnit } : {}),
    ...(introIsFreeTrial ? { introIsFreeTrial: true } : {}),
  };
}

function storeKitProvidedIntroTerms(p: ChinottoPaywallPackage): boolean {
  return (
    p.introCycles != null &&
    typeof p.introCycles === 'number' &&
    p.introCycles > 0 &&
    p.introPeriodUnit != null &&
    String(p.introPeriodUnit).trim() !== ''
  );
}

async function attachIosIntroEligibilityHints(packages: ChinottoPaywallPackage[]): Promise<void> {
  if (Platform.OS !== 'ios' || packages.length === 0) {
    return;
  }
  const needsHint = packages.filter((p) => !storeKitProvidedIntroTerms(p));
  const uniqueIds = [...new Set(needsHint.map((p) => p.storeProductId))];
  if (uniqueIds.length === 0) {
    return;
  }
  try {
    const map = await Purchases.checkTrialOrIntroductoryPriceEligibility(uniqueIds);
    for (const p of needsHint) {
      const row = map[p.storeProductId];
      if (row?.status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE) {
        p.introTrialEligibleUndisclosed = true;
      }
    }
  } catch {
    /* eligibility is optional UI hint */
  }
}

export type ChinottoOfferingLoadResult =
  | {
      ok: true;
      /** Current offering from RevenueCat (`offerings.current`). */
      offering: PurchasesOffering;
      /** Known Chinotto tiers only; unknown packages are skipped. */
      packages: ChinottoPaywallPackage[];
    }
  | {
      ok: false;
      reason: 'fetch_failed' | 'no_offerings' | 'no_current_offering';
    };

/**
 * Loads `Purchases.getOfferings()` and normalizes the **current** offering’s packages.
 * Missing current offering is common before dashboard setup — handle `ok: false` without throwing.
 */
export async function loadCurrentChinottoOffering(): Promise<ChinottoOfferingLoadResult> {
  const offerings = await getOfferings();
  if (offerings == null) {
    return { ok: false, reason: 'fetch_failed' };
  }

  const allKeys = Object.keys(offerings.all);
  if (allKeys.length === 0 && offerings.current == null) {
    return { ok: false, reason: 'no_offerings' };
  }

  const current = offerings.current;
  if (current == null) {
    return { ok: false, reason: 'no_current_offering' };
  }

  const mapped: ChinottoPaywallPackage[] = [];
  for (const rcPackage of current.availablePackages) {
    const kind = inferChinottoPackageKind(rcPackage);
    if (kind == null) {
      continue;
    }
    const rawPrice = (rcPackage.product as { priceString?: unknown }).priceString;
    const priceString =
      typeof rawPrice === 'string' && rawPrice.trim() !== '' ? rawPrice : undefined;
    const introMeta = extractIntroMeta(rcPackage.product);

    mapped.push({
      kind,
      rcPackage,
      storeProductId: rcPackage.product.identifier,
      ...(priceString != null ? { priceString } : {}),
      ...introMeta,
    });
  }

  await attachIosIntroEligibilityHints(mapped);

  return {
    ok: true,
    offering: current,
    packages: sortChinottoPackages(mapped),
  };
}
