import type { PurchasesPackage } from 'react-native-purchases';
import Purchases from 'react-native-purchases';

import {
  CHINOTTO_PACKAGE_KIND_ORDER,
  type ChinottoPackageKind,
  type ChinottoStoreProductId,
  RC_PRODUCT_IDS,
} from './constants';

/**
 * Map a store product id to a Chinotto tier. Supports exact ids and common `bundle.suffix` patterns.
 */
export function storeProductIdToKind(productId: string): ChinottoPackageKind | null {
  const lower = productId.trim().toLowerCase();
  // Lifetime is often named `unlock` / `*.unlock` in the store (not `*.lifetime`).
  if (lower === 'unlock' || lower.endsWith('.unlock') || lower.endsWith('_unlock')) {
    return 'lifetime';
  }
  const values = Object.values(RC_PRODUCT_IDS) as ChinottoStoreProductId[];
  for (const v of values) {
    if (lower === v || lower.endsWith(`.${v}`) || lower.endsWith(`_${v}`)) {
      return v;
    }
  }
  return null;
}

/**
 * Map a RevenueCat package to `monthly` | `yearly` | `lifetime`.
 *
 * Priority: store product id → RC template package identifiers (`$rc_*`) → `packageType` enum.
 * Unrecognized packages return `null` (omitted from normalized offering lists).
 */
export function inferChinottoPackageKind(pkg: PurchasesPackage): ChinottoPackageKind | null {
  const byProduct = storeProductIdToKind(pkg.product.identifier);
  if (byProduct != null) {
    return byProduct;
  }

  switch (pkg.identifier) {
    case '$rc_monthly':
      return 'monthly';
    case '$rc_annual':
    case '$rc_yearly':
      return 'yearly';
    case '$rc_lifetime':
      return 'lifetime';
    default:
      break;
  }

  const pt = pkg.packageType;
  if (pt === Purchases.PACKAGE_TYPE.MONTHLY) {
    return 'monthly';
  }
  if (pt === Purchases.PACKAGE_TYPE.ANNUAL) {
    return 'yearly';
  }
  if (pt === Purchases.PACKAGE_TYPE.LIFETIME) {
    return 'lifetime';
  }

  return null;
}

export function sortChinottoPackages<T extends { kind: ChinottoPackageKind }>(items: T[]): T[] {
  const order = CHINOTTO_PACKAGE_KIND_ORDER;
  return [...items].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
}
