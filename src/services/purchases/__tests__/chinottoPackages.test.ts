import type { PurchasesPackage } from 'react-native-purchases';
import Purchases from 'react-native-purchases';

import { inferChinottoPackageKind, sortChinottoPackages, storeProductIdToKind } from '../chinottoPackages';

/** Minimal RC package shape for unit tests (full `PurchasesStoreProduct` is not needed). */
function pkg(mock: Record<string, unknown>): PurchasesPackage {
  return mock as unknown as PurchasesPackage;
}

describe('chinottoPackages', () => {
  it('storeProductIdToKind matches exact and suffix ids', () => {
    expect(storeProductIdToKind('monthly')).toBe('monthly');
    expect(storeProductIdToKind('com.chinotto.monthly')).toBe('monthly');
    expect(storeProductIdToKind('chinotto.pro.monthly')).toBe('monthly');
    expect(storeProductIdToKind('chinotto.pro.yearly')).toBe('yearly');
    expect(storeProductIdToKind('chinotto.pro.unlock')).toBe('lifetime');
    expect(storeProductIdToKind('unknown')).toBeNull();
  });

  it('inferChinottoPackageKind uses product id, $rc_*, and PACKAGE_TYPE', () => {
    expect(
      inferChinottoPackageKind(
        pkg({
          identifier: 'custom',
          packageType: Purchases.PACKAGE_TYPE.MONTHLY,
          product: { identifier: 'monthly' },
        })
      )
    ).toBe('monthly');

    expect(
      inferChinottoPackageKind(
        pkg({
          identifier: '$rc_annual',
          packageType: Purchases.PACKAGE_TYPE.UNKNOWN,
          product: { identifier: 'something_else' },
        })
      )
    ).toBe('yearly');

    expect(
      inferChinottoPackageKind(
        pkg({
          identifier: 'x',
          packageType: Purchases.PACKAGE_TYPE.LIFETIME,
          product: { identifier: 'x' },
        })
      )
    ).toBe('lifetime');
  });

  it('sortChinottoPackages orders monthly, yearly, lifetime', () => {
    const sorted = sortChinottoPackages([
      { kind: 'lifetime' as const, x: 1 },
      { kind: 'monthly' as const, x: 2 },
      { kind: 'yearly' as const, x: 3 },
    ]);
    expect(sorted.map((p) => p.kind)).toEqual(['monthly', 'yearly', 'lifetime']);
  });
});
