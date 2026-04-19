import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import Purchases, { INTRO_ELIGIBILITY_STATUS } from 'react-native-purchases';

import { loadCurrentChinottoOffering } from '../offerings';
import * as revenueCat from '../revenueCat';

function mockPackage(
  id: string,
  productId: string,
  packageType: string
): PurchasesPackage {
  return {
    identifier: id,
    packageType,
    product: { identifier: productId },
  } as PurchasesPackage;
}

describe('loadCurrentChinottoOffering', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns no_current_offering when current is null', async () => {
    jest.spyOn(revenueCat, 'getOfferings').mockResolvedValue({
      current: null,
      all: { other: {} as PurchasesOffering },
    } as never);

    const r = await loadCurrentChinottoOffering();
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('no_current_offering');
    }
  });

  it('normalizes and sorts packages from current offering', async () => {
    const offering = {
      identifier: 'default',
      serverDescription: '',
      metadata: {},
      availablePackages: [
        mockPackage('p1', 'lifetime', Purchases.PACKAGE_TYPE.LIFETIME),
        mockPackage('p2', 'monthly', Purchases.PACKAGE_TYPE.MONTHLY),
        mockPackage('p3', 'yearly', Purchases.PACKAGE_TYPE.ANNUAL),
      ],
      lifetime: null,
      annual: null,
      sixMonth: null,
      threeMonth: null,
      twoMonth: null,
      monthly: null,
      weekly: null,
    } as PurchasesOffering;

    jest.spyOn(revenueCat, 'getOfferings').mockResolvedValue({
      current: offering,
      all: { default: offering },
    } as never);

    const r = await loadCurrentChinottoOffering();
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.packages.map((p) => p.kind)).toEqual(['monthly', 'yearly', 'lifetime']);
      expect(r.packages[0].storeProductId).toBe('monthly');
    }
  });

  it('maps intro offer metadata when available on product', async () => {
    const withIntro = {
      ...mockPackage('p2', 'monthly', Purchases.PACKAGE_TYPE.MONTHLY),
      product: {
        identifier: 'monthly',
        priceString: '$4.99',
        introPrice: {
          priceString: '$0.00',
          cycles: 1,
          periodUnit: 'WEEK',
        },
      },
    } as PurchasesPackage;
    const offering = {
      identifier: 'default',
      serverDescription: '',
      metadata: {},
      availablePackages: [withIntro],
      lifetime: null,
      annual: null,
      sixMonth: null,
      threeMonth: null,
      twoMonth: null,
      monthly: null,
      weekly: null,
    } as PurchasesOffering;

    jest.spyOn(revenueCat, 'getOfferings').mockResolvedValue({
      current: offering,
      all: { default: offering },
    } as never);

    const r = await loadCurrentChinottoOffering();
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.packages[0]).toMatchObject({
        kind: 'monthly',
        introPriceString: '$0.00',
        introCycles: 1,
        introPeriodUnit: 'WEEK',
        introIsFreeTrial: true,
      });
    }
  });

  it('maps free trial from discounts metadata fallback', async () => {
    const withDiscountTrial = {
      ...mockPackage('p2', 'monthly', Purchases.PACKAGE_TYPE.MONTHLY),
      product: {
        identifier: 'monthly',
        priceString: '$4.99',
        discounts: [
          {
            paymentMode: 'FREE_TRIAL',
            cycles: 1,
            periodUnit: 'WEEK',
          },
        ],
      },
    } as unknown as PurchasesPackage;
    const offering = {
      identifier: 'default',
      serverDescription: '',
      metadata: {},
      availablePackages: [withDiscountTrial],
      lifetime: null,
      annual: null,
      sixMonth: null,
      threeMonth: null,
      twoMonth: null,
      monthly: null,
      weekly: null,
    } as PurchasesOffering;

    jest.spyOn(revenueCat, 'getOfferings').mockResolvedValue({
      current: offering,
      all: { default: offering },
    } as never);

    const r = await loadCurrentChinottoOffering();
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.packages[0]).toMatchObject({
        kind: 'monthly',
        introCycles: 1,
        introPeriodUnit: 'WEEK',
        introIsFreeTrial: true,
      });
    }
  });

  it('sets introTrialEligibleUndisclosed when intro metadata is missing but eligibility is eligible', async () => {
    const noIntro = {
      ...mockPackage('p2', 'monthly', Purchases.PACKAGE_TYPE.MONTHLY),
      product: {
        identifier: 'monthly',
        priceString: '$4.99',
      },
    } as unknown as PurchasesPackage;
    const offering = {
      identifier: 'default',
      serverDescription: '',
      metadata: {},
      availablePackages: [noIntro],
      lifetime: null,
      annual: null,
      sixMonth: null,
      threeMonth: null,
      twoMonth: null,
      monthly: null,
      weekly: null,
    } as PurchasesOffering;

    jest.spyOn(revenueCat, 'getOfferings').mockResolvedValue({
      current: offering,
      all: { default: offering },
    } as never);
    jest.spyOn(Purchases, 'checkTrialOrIntroductoryPriceEligibility').mockResolvedValue({
      monthly: {
        status: INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE,
        description: '',
      },
    });

    const r = await loadCurrentChinottoOffering();
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.packages[0]).toMatchObject({
        kind: 'monthly',
        introTrialEligibleUndisclosed: true,
      });
    }
  });

  it('maps free trial when periodNumberOfUnits is provided instead of cycles', async () => {
    const withPeriodUnits = {
      ...mockPackage('p2', 'monthly', Purchases.PACKAGE_TYPE.MONTHLY),
      product: {
        identifier: 'monthly',
        priceString: '$4.99',
        introPrice: {
          paymentMode: 'FREE_TRIAL',
          periodNumberOfUnits: 1,
          periodUnit: 'WEEK',
        },
      },
    } as unknown as PurchasesPackage;
    const offering = {
      identifier: 'default',
      serverDescription: '',
      metadata: {},
      availablePackages: [withPeriodUnits],
      lifetime: null,
      annual: null,
      sixMonth: null,
      threeMonth: null,
      twoMonth: null,
      monthly: null,
      weekly: null,
    } as PurchasesOffering;

    jest.spyOn(revenueCat, 'getOfferings').mockResolvedValue({
      current: offering,
      all: { default: offering },
    } as never);

    const r = await loadCurrentChinottoOffering();
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.packages[0]).toMatchObject({
        kind: 'monthly',
        introCycles: 1,
        introPeriodUnit: 'WEEK',
        introIsFreeTrial: true,
      });
    }
  });
});
