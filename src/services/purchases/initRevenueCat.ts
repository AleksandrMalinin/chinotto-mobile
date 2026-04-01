import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, type CustomerInfoUpdateListener } from 'react-native-purchases';

function iosStoreKitVersionFromEnv():
  | typeof Purchases.STOREKIT_VERSION.STOREKIT_1
  | typeof Purchases.STOREKIT_VERSION.STOREKIT_2
  | undefined {
  const raw = process.env.EXPO_PUBLIC_REVENUECAT_IOS_STOREKIT_VERSION?.trim().toUpperCase();
  if (raw === 'STOREKIT_1') {
    return Purchases.STOREKIT_VERSION.STOREKIT_1;
  }
  if (raw === 'STOREKIT_2') {
    return Purchases.STOREKIT_VERSION.STOREKIT_2;
  }
  return undefined;
}

import { REVENUECAT_IOS_API_KEY } from './constants';
import { syncEntitlementCacheFromCustomerInfo } from './entitlementCache';
import { warnIfActiveSubscriptionButMissingChinottoProEntitlement } from './entitlements';
import { logRevenueCatSubscriptionsAndProducts } from './revenueCatDebugLog';
import { refreshEntitlementCacheFromRevenueCat } from './revenueCat';

let didConfigure = false;

/**
 * RevenueCat / App Store setup checklist: `docs/billing/revenuecat-dashboard.md` (entitlement **Chinotto Pro**, products, current offering).
 *
 * **Customer info:** registers the canonical `addCustomerInfoUpdateListener` that keeps `entitlementCache` in sync.
 * Avoid stacking a second listener for the same job (see `useSubscription` — prefer refresh helpers until consolidated).
 *
 * Configures the native Purchases SDK **once** per JS runtime.
 * - Verbose logs in development, minimal in production (RevenueCat still logs errors).
 * - iOS: uses {@link REVENUECAT_IOS_API_KEY}.
 * - Android: configures only if `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` is set (optional).
 * - Web / unsupported: no-op.
 *
 * Must run on a **development build** with native code (not Expo Go).
 */
export function initRevenueCat(): void {
  if (didConfigure) {
    return;
  }
  if (Platform.OS === 'web') {
    return;
  }

  try {
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);

    if (Platform.OS === 'ios') {
      const storeKitVersion = iosStoreKitVersionFromEnv();
      Purchases.configure({
        apiKey: REVENUECAT_IOS_API_KEY,
        ...(storeKitVersion != null ? { storeKitVersion } : {}),
      });
    } else if (Platform.OS === 'android') {
      const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
      if (androidKey == null || androidKey === '') {
        if (__DEV__) {
          console.warn(
            '[RevenueCat] Android: set EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY to enable Purchases on Android.'
          );
        }
        return;
      }
      Purchases.configure({ apiKey: androidKey });
    } else {
      return;
    }

    didConfigure = true;

    // Keep non-React gating in sync whenever RC pushes an update (renewal, restore, etc.).
    const onCustomerInfoUpdated: CustomerInfoUpdateListener = (customerInfo) => {
      syncEntitlementCacheFromCustomerInfo(customerInfo);
      warnIfActiveSubscriptionButMissingChinottoProEntitlement(customerInfo);
    };
    Purchases.addCustomerInfoUpdateListener(onCustomerInfoUpdated);
  } catch (err) {
    if (__DEV__) {
      console.warn('[RevenueCat] initRevenueCat failed', err);
    }
  }
}

/**
 * App root: configure SDK (once) + initial CustomerInfo fetch into entitlement cache.
 */
export async function bootstrapRevenueCat(): Promise<void> {
  initRevenueCat();
  const info = await refreshEntitlementCacheFromRevenueCat();
  await logRevenueCatSubscriptionsAndProducts(info, 'bootstrap');
}
