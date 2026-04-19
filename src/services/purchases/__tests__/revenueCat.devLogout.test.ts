import type { CustomerInfo } from 'react-native-purchases';
import Purchases from 'react-native-purchases';

import { CHINOTTO_PRO_ENTITLEMENT_ID } from '../constants';
import { getCachedHasChinottoProEntitlement, syncEntitlementCacheFromCustomerInfo } from '../entitlementCache';
import { devRevenueCatLogOutAndRefreshEntitlementCache } from '../revenueCat';

const emptyInfo = {
  entitlements: { active: {}, all: {} },
} as unknown as CustomerInfo;

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    isAnonymous: jest.fn(),
    logOut: jest.fn(),
    invalidateCustomerInfoCache: jest.fn(),
    syncPurchasesForResult: jest.fn(),
  },
}));

describe('devRevenueCatLogOutAndRefreshEntitlementCache', () => {
  const devGlobal = globalThis as typeof globalThis & { __DEV__?: boolean };
  const originalDev = devGlobal.__DEV__;

  beforeEach(() => {
    devGlobal.__DEV__ = true;
    syncEntitlementCacheFromCustomerInfo({
      entitlements: {
        active: { [CHINOTTO_PRO_ENTITLEMENT_ID]: { identifier: CHINOTTO_PRO_ENTITLEMENT_ID } },
        all: {},
      },
    } as unknown as CustomerInfo);
    jest.mocked(Purchases.isAnonymous).mockResolvedValue(false);
    jest.mocked(Purchases.logOut).mockResolvedValue(emptyInfo);
    jest.mocked(Purchases.invalidateCustomerInfoCache).mockResolvedValue(undefined);
    jest.mocked(Purchases.syncPurchasesForResult).mockResolvedValue({ customerInfo: emptyInfo });
  });

  afterEach(() => {
    devGlobal.__DEV__ = originalDev;
    syncEntitlementCacheFromCustomerInfo(null);
    jest.clearAllMocks();
  });

  it('calls logOut when not anonymous and clears Chinotto Pro from entitlement cache', async () => {
    expect(getCachedHasChinottoProEntitlement()).toBe(true);

    await devRevenueCatLogOutAndRefreshEntitlementCache();

    expect(Purchases.isAnonymous).toHaveBeenCalled();
    expect(Purchases.logOut).toHaveBeenCalled();
    expect(Purchases.invalidateCustomerInfoCache).not.toHaveBeenCalled();
    expect(Purchases.syncPurchasesForResult).not.toHaveBeenCalled();
    expect(getCachedHasChinottoProEntitlement()).toBe(false);
  });

  it('invalidates cache and syncPurchasesForResult when anonymous', async () => {
    jest.mocked(Purchases.isAnonymous).mockResolvedValue(true);

    await devRevenueCatLogOutAndRefreshEntitlementCache();

    expect(Purchases.logOut).not.toHaveBeenCalled();
    expect(Purchases.invalidateCustomerInfoCache).toHaveBeenCalled();
    expect(Purchases.syncPurchasesForResult).toHaveBeenCalled();
    expect(getCachedHasChinottoProEntitlement()).toBe(false);
  });

  it('is a no-op when __DEV__ is false', async () => {
    devGlobal.__DEV__ = false;

    await devRevenueCatLogOutAndRefreshEntitlementCache();

    expect(Purchases.isAnonymous).not.toHaveBeenCalled();
    expect(Purchases.logOut).not.toHaveBeenCalled();
  });
});
