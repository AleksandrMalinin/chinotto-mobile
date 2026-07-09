import { Alert, type AlertButton } from 'react-native';

/**
 * Minimal dev-only QA menu (`__DEV__`). Fewer entries — most paywall cases use
 * {@link onResetPaywallForPurchaseTesting} (RC log out + clear local flags).
 */
export type DevMenuOptions = {
  /** RC log out + clear local paywall flags — usual path to re-test purchases. */
  onResetPaywallForPurchaseTesting?: () => void | Promise<void>;
  /** Re-open sync modal on the post–“Sync enabled” / desktop link step. */
  onPreviewSyncEnabledSheet?: () => void;
  /** Clear Umami analytics prompt flag and reload JS. */
  onResetAnalyticsPrompt?: () => void | Promise<void>;
  /** Clear sync shimmer prefs + first-launch capture prefs, then reload JS (`DevSettings.reload`). */
  onResetSyncCaptureQA?: () => void | Promise<void>;
  /** Show the shipped `UpdateScreen` in soft or forced mode (wired from `App`). */
  onPreviewAppUpdateModal?: (mode: 'soft' | 'forced') => void;
  /** Clear one-time spatial gesture hints (thread peel + temporal map). */
  onResetSpatialGestureHints?: () => void | Promise<void>;
};

/**
 * Single flat alert — Settings → logo (iOS dev builds).
 */
export function showDevMenu(options: DevMenuOptions): void {
  if (!__DEV__) {
    return;
  }

  const buttons: AlertButton[] = [];

  if (options.onResetPaywallForPurchaseTesting != null) {
    buttons.push({
      text: 'Reset paywall for testing',
      onPress: () => void options.onResetPaywallForPurchaseTesting?.(),
    });
  }
  if (options.onPreviewSyncEnabledSheet != null) {
    buttons.push({
      text: 'Preview “Sync enabled” sheet',
      onPress: options.onPreviewSyncEnabledSheet,
    });
  }
  if (options.onResetAnalyticsPrompt != null) {
    buttons.push({
      text: 'Reset analytics prompt',
      onPress: () => void options.onResetAnalyticsPrompt?.(),
    });
  }
  if (options.onResetSyncCaptureQA != null) {
    buttons.push({
      text: 'Reset sync & capture QA',
      onPress: () => void options.onResetSyncCaptureQA?.(),
    });
  }
  if (options.onPreviewAppUpdateModal != null) {
    const preview = options.onPreviewAppUpdateModal;
    buttons.push({
      text: 'Preview app update (soft)',
      onPress: () => preview('soft'),
    });
    buttons.push({
      text: 'Preview app update (forced)',
      onPress: () => preview('forced'),
    });
  }
  if (options.onResetSpatialGestureHints != null) {
    buttons.push({
      text: 'Reset spatial gesture hints',
      onPress: () => void options.onResetSpatialGestureHints?.(),
    });
  }
  buttons.push({ text: 'Cancel', style: 'cancel' });
  Alert.alert('Dev menu', undefined, buttons);
}
