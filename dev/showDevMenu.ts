import { Alert, type AlertButton } from 'react-native';

export type DevMenuOptions = {
  /** Clears local trial + legacy “subscribed” AsyncStorage flags so the sync paywall can show again (device-only, not Apple ID). */
  onClearLocalSyncPaywallFlags?: () => void | Promise<void>;
  /**
   * iOS: `Purchases.logOut()` + refresh entitlement cache — new RC anonymous user so StoreKit-cleared sim state matches gating.
   */
  onRevenueCatLogOut?: () => void | Promise<void>;
  /** iOS: RC log out + clear local paywall flags — fastest way to see the plan picker again when testing purchases. */
  onResetPaywallForPurchaseTesting?: () => void | Promise<void>;
  /** iOS: re-open sync modal on the post–“Sync enabled” / desktop link step (QA, repeatable). */
  onPreviewSyncEnabledSheet?: () => void;
  /** Clear first-launch empty capture reveal flag so delayed keyboard + art show again (dev builds). */
  onResetFirstLaunchEmptyCaptureReveal?: () => void | Promise<void>;
};

/**
 * Extensible dev-only actions (development builds / `__DEV__` only).
 * Trigger from Settings (iOS dev builds) after opening via header logo.
 */
export function showDevMenu(options: DevMenuOptions): void {
  if (!__DEV__) {
    return;
  }
  const buttons: AlertButton[] = [];
  if (options.onClearLocalSyncPaywallFlags != null) {
    buttons.push({
      text: 'Clear local sync paywall flags',
      onPress: () => void options.onClearLocalSyncPaywallFlags?.(),
    });
  }
  if (options.onRevenueCatLogOut != null) {
    buttons.push({
      text: 'RevenueCat: refresh (log out or sync)',
      onPress: () => void options.onRevenueCatLogOut?.(),
    });
  }
  if (options.onResetPaywallForPurchaseTesting != null) {
    buttons.push({
      text: 'Reset paywall for purchase testing',
      onPress: () => void options.onResetPaywallForPurchaseTesting?.(),
    });
  }
  if (options.onPreviewSyncEnabledSheet != null) {
    buttons.push({
      text: 'Preview “Sync enabled” sheet',
      onPress: options.onPreviewSyncEnabledSheet,
    });
  }
  if (options.onResetFirstLaunchEmptyCaptureReveal != null) {
    buttons.push({
      text: 'Reset first-launch empty capture',
      onPress: () => void options.onResetFirstLaunchEmptyCaptureReveal?.(),
    });
  }
  buttons.push({ text: 'Cancel', style: 'cancel' });
  Alert.alert('Dev menu', undefined, buttons);
}
