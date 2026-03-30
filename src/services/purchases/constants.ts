/**
 * RevenueCat entitlement identifier — must match the dashboard exactly (case-sensitive).
 */
export const CHINOTTO_PRO_ENTITLEMENT_ID = 'Chinotto Pro' as const;

/**
 * App Store / Play product identifiers — must match App Store Connect / Play Console and RevenueCat product setup.
 * Packages in the **current** RevenueCat offering should point at these products; entitlement `Chinotto Pro` unlocks from them.
 */
export const RC_PRODUCT_IDS = {
  monthly: 'monthly',
  yearly: 'yearly',
  lifetime: 'lifetime',
} as const;

/** Typed product id union (store / RC product identifier). */
export type ChinottoStoreProductId = (typeof RC_PRODUCT_IDS)[keyof typeof RC_PRODUCT_IDS];

/**
 * Logical tier for UI / ordering. Mapped from RevenueCat packages via {@link inferChinottoPackageKind}.
 */
export type ChinottoPackageKind = 'monthly' | 'yearly' | 'lifetime';

/** Default order when presenting packages (e.g. future paywall). */
export const CHINOTTO_PACKAGE_KIND_ORDER: readonly ChinottoPackageKind[] = [
  'monthly',
  'yearly',
  'lifetime',
] as const;

/**
 * iOS public SDK key. Override via `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` for production / other envs.
 */
export const REVENUECAT_IOS_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? 'test_qrJRQDJwlTvrHvSbLqajDIRDXix';
