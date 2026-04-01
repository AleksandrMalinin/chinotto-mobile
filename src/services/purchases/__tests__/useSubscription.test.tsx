import { act, renderHook, waitFor } from '@testing-library/react-native';

import { CHINOTTO_PRO_ENTITLEMENT_ID } from '../constants';
import { useSubscription } from '../useSubscription';

const Purchases = jest.requireMock('react-native-purchases').default;

describe('useSubscription', () => {
  beforeEach(() => {
    jest.mocked(Purchases.getCustomerInfo).mockResolvedValue({
      entitlements: {
        active: {
          [CHINOTTO_PRO_ENTITLEMENT_ID]: { identifier: CHINOTTO_PRO_ENTITLEMENT_ID },
        },
        all: {},
      },
    } as never);
  });

  it('exposes isSubscribed from Chinotto Pro entitlement', async () => {
    const { result } = renderHook(() => useSubscription());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isSubscribed).toBe(true);
    expect(result.current.customerInfo).toBeTruthy();
  });

  it('restore delegates to Purchases.restorePurchases', async () => {
    const { result } = renderHook(() => useSubscription());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.restore();
    });

    expect(Purchases.restorePurchases).toHaveBeenCalled();
  });
});
