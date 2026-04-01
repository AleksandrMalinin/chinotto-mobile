import type { CustomerInfo } from 'react-native-purchases';

import { CHINOTTO_PRO_ENTITLEMENT_ID } from '../constants';
import {
  getCachedHasChinottoProEntitlement,
  resetRevenueCatEntitlementCacheForTests,
  syncEntitlementCacheFromCustomerInfo,
} from '../entitlementCache';

function makeCustomerInfo(active: Record<string, unknown>): CustomerInfo {
  return {
    entitlements: { active: active as CustomerInfo['entitlements']['active'], all: {} },
  } as CustomerInfo;
}

describe('entitlementCache', () => {
  beforeEach(() => {
    resetRevenueCatEntitlementCacheForTests();
  });

  it('reflects Chinotto Pro in active entitlements', () => {
    syncEntitlementCacheFromCustomerInfo(
      makeCustomerInfo({
        [CHINOTTO_PRO_ENTITLEMENT_ID]: { identifier: CHINOTTO_PRO_ENTITLEMENT_ID },
      })
    );
    expect(getCachedHasChinottoProEntitlement()).toBe(true);
  });

  it('clears when CustomerInfo is null', () => {
    syncEntitlementCacheFromCustomerInfo(
      makeCustomerInfo({
        [CHINOTTO_PRO_ENTITLEMENT_ID]: { identifier: CHINOTTO_PRO_ENTITLEMENT_ID },
      })
    );
    syncEntitlementCacheFromCustomerInfo(null);
    expect(getCachedHasChinottoProEntitlement()).toBe(false);
  });
});
