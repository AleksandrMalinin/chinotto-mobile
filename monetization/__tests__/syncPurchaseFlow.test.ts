import type { ChinottoPaywallPackage } from '../../src/services/purchases/offerings';
import {
  openSyncPurchaseFlow,
  pickChinottoPackageForPurchase,
} from '../syncPurchaseFlow';

const mockGetCachedHasSyncEntitlement = jest.fn(() => false);
const mockRefresh = jest.fn((..._args: unknown[]) => Promise.resolve(null));
const mockLoadOffering = jest.fn();
const mockPurchase = jest.fn();

jest.mock('../subscriptionState', () => ({
  getCachedHasSyncEntitlement: () => mockGetCachedHasSyncEntitlement(),
}));

jest.mock('../../src/services/purchases/revenueCat', () => ({
  refreshEntitlementCacheFromRevenueCat: (...args: unknown[]) => mockRefresh(...args),
}));

jest.mock('../../src/services/purchases/offerings', () => ({
  loadCurrentChinottoOffering: (...args: unknown[]) => mockLoadOffering(...args),
}));

jest.mock('../../src/services/purchases/purchasePackage', () => ({
  purchaseChinottoPackage: (...args: unknown[]) => mockPurchase(...args),
}));

function row(kind: 'monthly' | 'yearly' | 'lifetime'): ChinottoPaywallPackage {
  return {
    kind,
    storeProductId: `id.${kind}`,
    priceString: '$1',
    rcPackage: { identifier: kind, product: { identifier: `id.${kind}` } } as ChinottoPaywallPackage['rcPackage'],
  };
}

describe('pickChinottoPackageForPurchase', () => {
  it('prefers explicit kind when present', () => {
    const p = pickChinottoPackageForPurchase([row('monthly'), row('yearly')], 'monthly');
    expect(p?.kind).toBe('monthly');
  });

  it('falls back to yearly then monthly then lifetime', () => {
    expect(pickChinottoPackageForPurchase([row('lifetime'), row('monthly')])?.kind).toBe('monthly');
    expect(pickChinottoPackageForPurchase([row('lifetime'), row('yearly')])?.kind).toBe('yearly');
    expect(pickChinottoPackageForPurchase([row('lifetime')])?.kind).toBe('lifetime');
  });

  it('returns null for empty list', () => {
    expect(pickChinottoPackageForPurchase([])).toBeNull();
  });
});

describe('openSyncPurchaseFlow', () => {
  beforeEach(() => {
    mockGetCachedHasSyncEntitlement.mockReset();
    mockGetCachedHasSyncEntitlement.mockReturnValue(false);
    mockRefresh.mockClear();
    mockRefresh.mockImplementation(() => Promise.resolve(null));
    mockLoadOffering.mockReset();
    mockPurchase.mockReset();
  });

  it('returns already_has_sync_access when cache says entitled', async () => {
    mockGetCachedHasSyncEntitlement.mockReturnValue(true);
    const r = await openSyncPurchaseFlow();
    expect(r).toEqual({ kind: 'already_has_sync_access' });
    expect(mockLoadOffering).not.toHaveBeenCalled();
  });

  it('returns already_has_sync_access after refresh updates cache', async () => {
    mockGetCachedHasSyncEntitlement.mockReturnValueOnce(false).mockReturnValue(true);
    const r = await openSyncPurchaseFlow();
    expect(r).toEqual({ kind: 'already_has_sync_access' });
    expect(mockRefresh).toHaveBeenCalled();
    expect(mockLoadOffering).not.toHaveBeenCalled();
  });

  it('returns unavailable when offering load fails', async () => {
    mockLoadOffering.mockResolvedValue({ ok: false, reason: 'no_current_offering' });
    const r = await openSyncPurchaseFlow();
    expect(r).toEqual({ kind: 'unavailable', reason: 'no_current_offering' });
  });

  it('returns unavailable when no mappable packages', async () => {
    mockLoadOffering.mockResolvedValue({
      ok: true,
      offering: {} as never,
      packages: [],
    });
    const r = await openSyncPurchaseFlow();
    expect(r).toEqual({ kind: 'unavailable', reason: 'no_packages' });
  });

  it('returns purchased on successful purchase', async () => {
    mockGetCachedHasSyncEntitlement
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    mockLoadOffering.mockResolvedValue({
      ok: true,
      offering: {} as never,
      packages: [row('yearly'), row('monthly')],
    });
    mockPurchase.mockResolvedValue({
      status: 'success',
      productIdentifier: 'chinotto.pro.yearly',
      customerInfo: {} as never,
    });
    const r = await openSyncPurchaseFlow({ packageKind: 'yearly' });
    expect(r).toEqual({ kind: 'purchased', productIdentifier: 'chinotto.pro.yearly' });
    expect(mockPurchase).toHaveBeenCalledTimes(1);
  });

  it('returns purchased_without_entitlement when purchase succeeds but sync gate stays false', async () => {
    mockLoadOffering.mockResolvedValue({
      ok: true,
      offering: {} as never,
      packages: [row('monthly')],
    });
    mockPurchase.mockResolvedValue({
      status: 'success',
      productIdentifier: 'chinotto.pro.monthly',
      customerInfo: {} as never,
    });
    const r = await openSyncPurchaseFlow({ packageKind: 'monthly' });
    expect(r).toEqual({
      kind: 'purchased_without_entitlement',
      productIdentifier: 'chinotto.pro.monthly',
    });
  });

  it('skips loadCurrentChinottoOffering when preloadedPackages provided', async () => {
    mockGetCachedHasSyncEntitlement
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    mockPurchase.mockResolvedValue({
      status: 'success',
      productIdentifier: 'x',
      customerInfo: {} as never,
    });
    const r = await openSyncPurchaseFlow({
      packageKind: 'monthly',
      preloadedPackages: [row('monthly')],
    });
    expect(r.kind).toBe('purchased');
    expect(mockLoadOffering).not.toHaveBeenCalled();
  });

  it('returns cancelled when user cancels', async () => {
    mockLoadOffering.mockResolvedValue({
      ok: true,
      offering: {} as never,
      packages: [row('monthly')],
    });
    mockPurchase.mockResolvedValue({ status: 'cancelled' });
    const r = await openSyncPurchaseFlow();
    expect(r).toEqual({ kind: 'cancelled' });
  });

  it('returns failed when purchase fails', async () => {
    mockLoadOffering.mockResolvedValue({
      ok: true,
      offering: {} as never,
      packages: [row('monthly')],
    });
    const err = new Error('store error');
    mockPurchase.mockResolvedValue({ status: 'failed', error: err });
    const r = await openSyncPurchaseFlow();
    expect(r).toEqual({ kind: 'failed', error: err });
  });
});
