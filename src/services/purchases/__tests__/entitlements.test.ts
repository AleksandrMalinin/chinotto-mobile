import type { CustomerInfo } from 'react-native-purchases';

import { CHINOTTO_PRO_ENTITLEMENT_ID } from '../constants';
import {
  hasChinottoPro,
  hasEntitlement,
  warnIfActiveSubscriptionButMissingChinottoProEntitlement,
} from '../entitlements';

function makeInfo(active: Record<string, unknown>): CustomerInfo {
  return {
    entitlements: { active: active as CustomerInfo['entitlements']['active'], all: {} },
  } as CustomerInfo;
}

describe('entitlements', () => {
  it('hasChinottoPro is true when Chinotto Pro is active', () => {
    expect(
      hasChinottoPro(
        makeInfo({
          [CHINOTTO_PRO_ENTITLEMENT_ID]: { identifier: CHINOTTO_PRO_ENTITLEMENT_ID },
        })
      )
    ).toBe(true);
  });

  it('hasEntitlement is false for missing id', () => {
    expect(hasEntitlement(makeInfo({}), 'Other')).toBe(false);
    expect(hasChinottoPro(null)).toBe(false);
  });

  it('warnIfActiveSubscriptionButMissingChinottoProEntitlement logs when subs without entitlement', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const info = {
      entitlements: { active: {}, all: {} },
      activeSubscriptions: ['chinotto.pro.monthly'],
    } as CustomerInfo;

    warnIfActiveSubscriptionButMissingChinottoProEntitlement(info);

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('warnIfActiveSubscriptionButMissingChinottoProEntitlement silent when entitlement present', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    warnIfActiveSubscriptionButMissingChinottoProEntitlement(
      makeInfo({
        [CHINOTTO_PRO_ENTITLEMENT_ID]: { identifier: CHINOTTO_PRO_ENTITLEMENT_ID },
      })
    );
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
