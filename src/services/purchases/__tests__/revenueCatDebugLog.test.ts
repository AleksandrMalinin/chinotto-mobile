import type { CustomerInfo } from 'react-native-purchases';

import { logRevenueCatSubscriptionsAndProducts } from '../revenueCatDebugLog';

const mockGetCustomerInfo = jest.fn();
const mockGetOfferings = jest.fn();

jest.mock('../revenueCat', () => ({
  getCustomerInfo: () => mockGetCustomerInfo(),
  getOfferings: () => mockGetOfferings(),
}));

describe('logRevenueCatSubscriptionsAndProducts', () => {
  beforeEach(() => {
    mockGetCustomerInfo.mockResolvedValue({
      entitlements: { active: { 'Chinotto Pro': { identifier: 'Chinotto Pro' } }, all: {} },
      activeSubscriptions: ['chinotto.pro.monthly'],
      allPurchasedProductIdentifiers: ['chinotto.pro.monthly'],
      originalAppUserId: '$RCAnonymousID:test',
    } as unknown as CustomerInfo);
    mockGetOfferings.mockResolvedValue({
      current: {
        identifier: 'default',
        availablePackages: [
          {
            identifier: '$rc_monthly',
            product: { identifier: 'chinotto.pro.monthly', priceString: '$3.99' },
          },
        ],
      },
      all: { default: {} },
    } as never);
  });

  it('logs structured snapshot with context', async () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await logRevenueCatSubscriptionsAndProducts(undefined, 'unit-test');

    expect(spy).toHaveBeenCalledWith(
      '[RevenueCat][debug] unit-test',
      expect.objectContaining({
        context: 'unit-test',
        customerInfo: expect.objectContaining({
          activeEntitlementIds: ['Chinotto Pro'],
          activeSubscriptions: ['chinotto.pro.monthly'],
        }),
        offerings: expect.objectContaining({
          currentOfferingId: 'default',
          currentPackages: expect.arrayContaining([
            expect.objectContaining({
              packageIdentifier: '$rc_monthly',
              productIdentifier: 'chinotto.pro.monthly',
              priceString: '$3.99',
            }),
          ]),
        }),
      })
    );
    spy.mockRestore();
  });
});
