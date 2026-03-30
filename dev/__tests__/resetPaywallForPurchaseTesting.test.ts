import { clearLocalSyncPaywallFlags } from '../../monetization/subscriptionState';
import { devRevenueCatLogOutAndRefreshEntitlementCache } from '../../src/services/purchases/revenueCat';
import { resetPaywallForPurchaseTesting } from '../resetPaywallForPurchaseTesting';

jest.mock('../../monetization/subscriptionState', () => ({
  clearLocalSyncPaywallFlags: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../src/services/purchases/revenueCat', () => ({
  devRevenueCatLogOutAndRefreshEntitlementCache: jest.fn(() => Promise.resolve()),
}));

describe('resetPaywallForPurchaseTesting', () => {
  const originalDev = global.__DEV__;

  beforeEach(() => {
    (global as { __DEV__: boolean }).__DEV__ = true;
    jest.clearAllMocks();
  });

  afterEach(() => {
    (global as { __DEV__: boolean }).__DEV__ = originalDev;
  });

  it('logs out RevenueCat then clears local paywall flags', async () => {
    const order: string[] = [];
    jest.mocked(devRevenueCatLogOutAndRefreshEntitlementCache).mockImplementation(async () => {
      order.push('rc');
    });
    jest.mocked(clearLocalSyncPaywallFlags).mockImplementation(async () => {
      order.push('local');
    });

    await resetPaywallForPurchaseTesting();

    expect(order).toEqual(['rc', 'local']);
    expect(devRevenueCatLogOutAndRefreshEntitlementCache).toHaveBeenCalledTimes(1);
    expect(clearLocalSyncPaywallFlags).toHaveBeenCalledTimes(1);
  });

  it('no-op when __DEV__ is false', async () => {
    (global as { __DEV__: boolean }).__DEV__ = false;

    await resetPaywallForPurchaseTesting();

    expect(devRevenueCatLogOutAndRefreshEntitlementCache).not.toHaveBeenCalled();
    expect(clearLocalSyncPaywallFlags).not.toHaveBeenCalled();
  });
});
