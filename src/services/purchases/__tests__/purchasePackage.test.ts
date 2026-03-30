import type { PurchasesPackage } from 'react-native-purchases';
import Purchases from 'react-native-purchases';

jest.mock('../revenueCatDebugLog', () => ({
  logRevenueCatSubscriptionsAndProducts: jest.fn(() => Promise.resolve()),
}));

import { resetRevenueCatEntitlementCacheForTests } from '../entitlementCache';
import { purchaseChinottoPackage } from '../purchasePackage';

const emptyCustomerInfo = {
  entitlements: { active: { 'Chinotto Pro': { identifier: 'Chinotto Pro' } }, all: {} },
} as never;

describe('purchaseChinottoPackage', () => {
  const rcPackage = { identifier: 'x', product: { identifier: 'monthly' } } as PurchasesPackage;

  beforeEach(() => {
    resetRevenueCatEntitlementCacheForTests();
    jest.mocked(Purchases.purchasePackage).mockReset();
  });

  it('returns success and syncs cache', async () => {
    jest.mocked(Purchases.purchasePackage).mockResolvedValue({
      customerInfo: emptyCustomerInfo,
      productIdentifier: 'monthly',
    } as never);

    const r = await purchaseChinottoPackage(rcPackage);
    expect(r.status).toBe('success');
    if (r.status === 'success') {
      expect(r.productIdentifier).toBe('monthly');
    }
    expect(Purchases.purchasePackage).toHaveBeenCalledWith(rcPackage);
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
