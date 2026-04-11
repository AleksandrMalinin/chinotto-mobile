import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import Purchases from 'react-native-purchases';

jest.mock('../revenueCatDebugLog', () => ({
  logRevenueCatSubscriptionsAndProducts: jest.fn(() => Promise.resolve()),
}));

import { getCachedHasChinottoProEntitlement, resetRevenueCatEntitlementCacheForTests } from '../entitlementCache';
import { purchaseChinottoPackage } from '../purchasePackage';

const withChinottoPro = {
  entitlements: { active: { 'Chinotto Pro': { identifier: 'Chinotto Pro' } }, all: {} },
} as unknown as CustomerInfo;

const withoutChinottoPro = {
  entitlements: { active: {}, all: {} },
} as unknown as CustomerInfo;

describe('purchaseChinottoPackage', () => {
  const rcPackage = { identifier: 'x', product: { identifier: 'monthly' } } as PurchasesPackage;

  beforeEach(() => {
    resetRevenueCatEntitlementCacheForTests();
    jest.mocked(Purchases.purchasePackage).mockReset();
    jest.mocked(Purchases.syncPurchasesForResult).mockReset();
    jest.mocked(Purchases.syncPurchasesForResult).mockResolvedValue({
      customerInfo: withoutChinottoPro,
    });
  });

  it('returns success and syncs cache', async () => {
    jest.mocked(Purchases.purchasePackage).mockResolvedValue({
      customerInfo: withChinottoPro,
      productIdentifier: 'monthly',
    } as never);

    const r = await purchaseChinottoPackage(rcPackage);
    expect(r.status).toBe('success');
    if (r.status === 'success') {
      expect(r.productIdentifier).toBe('monthly');
    }
    expect(Purchases.purchasePackage).toHaveBeenCalledWith(rcPackage);
    expect(jest.mocked(Purchases.syncPurchasesForResult)).not.toHaveBeenCalled();
  });

  it('updates entitlement when purchase payload lacks Chinotto Pro but syncPurchasesForResult returns it', async () => {
    jest.mocked(Purchases.purchasePackage).mockResolvedValue({
      customerInfo: withoutChinottoPro,
      productIdentifier: 'monthly',
    } as never);
    jest.mocked(Purchases.syncPurchasesForResult).mockResolvedValue({
      customerInfo: withChinottoPro,
    } as never);

    await purchaseChinottoPackage(rcPackage);

    expect(getCachedHasChinottoProEntitlement()).toBe(true);
    expect(jest.mocked(Purchases.syncPurchasesForResult)).toHaveBeenCalled();
  });

  it('returns cancelled on purchase cancel error', async () => {
    jest.mocked(Purchases.purchasePackage).mockRejectedValue({
      code: Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR,
      message: 'cancelled',
    });

    const r = await purchaseChinottoPackage(rcPackage);
    expect(r.status).toBe('cancelled');
  });

  it('returns failed on other errors', async () => {
    jest.mocked(Purchases.purchasePackage).mockRejectedValue(new Error('network'));

    const r = await purchaseChinottoPackage(rcPackage);
    expect(r.status).toBe('failed');
    if (r.status === 'failed') {
      expect(r.error.message).toBe('network');
    }
  });
});
