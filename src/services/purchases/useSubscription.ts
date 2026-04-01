import { useCallback, useEffect, useState } from 'react';
import { type CustomerInfo } from 'react-native-purchases';

import { syncEntitlementCacheFromCustomerInfo } from './entitlementCache';
import { hasChinottoPro } from './entitlements';
import { getCustomerInfo, restorePurchases } from './revenueCat';

export type UseSubscriptionResult = {
  /** True when `Chinotto Pro` is active in CustomerInfo. */
  isSubscribed: boolean;
  isLoading: boolean;
  customerInfo: CustomerInfo | null;
  refreshSubscription: () => Promise<void>;
  restore: () => Promise<void>;
};

/**
 * React hook for subscription UI (restore, future settings).
 * Listener ownership is centralized in `initRevenueCat`; this hook only performs explicit refresh/restore calls.
 */
export function useSubscription(): UseSubscriptionResult {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSubscription = useCallback(async () => {
    setIsLoading(true);
    try {
      const info = await getCustomerInfo();
      setCustomerInfo(info);
      syncEntitlementCacheFromCustomerInfo(info);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const restore = useCallback(async () => {
    setIsLoading(true);
    try {
      const info = await restorePurchases();
      setCustomerInfo(info);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSubscription();
  }, [refreshSubscription]);

  const isSubscribed = hasChinottoPro(customerInfo);

  return {
    isSubscribed,
    isLoading,
    customerInfo,
    refreshSubscription,
    restore,
  };
}
