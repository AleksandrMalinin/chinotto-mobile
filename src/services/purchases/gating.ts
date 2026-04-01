/**
 * Helpers for **sync-only** gating. Local capture stays free; import these only around cloud sync paths.
 */

export { CHINOTTO_PRO_ENTITLEMENT_ID } from './constants';
export { getCachedHasChinottoProEntitlement } from './entitlementCache';
export { hasChinottoPro, hasEntitlement } from './entitlements';
export { loadCurrentChinottoOffering } from './offerings';
export type { ChinottoOfferingLoadResult, ChinottoPaywallPackage } from './offerings';
export { purchaseChinottoPackage } from './purchasePackage';
export type { PurchaseChinottoPackageResult } from './purchasePackage';
export {
  inferChinottoPackageKind,
  sortChinottoPackages,
  storeProductIdToKind,
} from './chinottoPackages';
