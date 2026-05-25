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
  /** Toggle passive month scrubber QA (`__DEV__`). */
  onToggleTemporalNavScrubber?: () => void;
  /** Label suffix for temporal toggle, e.g. `on` / `off`. */
  temporalNavScrubberDevState?: 'on' | 'off';
  /** Replay the one-time Echo edge peek animation immediately. */
  onPreviewEchoEdgePeek?: () => void | Promise<void>;
  /** Clear AsyncStorage flag so auto peek can fire again on next eligibility. */
  onResetEchoEdgePeek?: () => void | Promise<void>;
  /** Cycle Echo UI: threshold → palimpsest → filament (`__DEV__`). */
  onCycleEchoUiVariant?: () => void;
  /** Current variant label for dev menu. */
  echoUiVariantDevLabel?: string;
  /** Toggle B3/B4/B5 stream calm scroll experiments (`__DEV__`). */
  onToggleStreamBoundedContinuity?: () => void;
  streamBoundedContinuityDevState?: 'on' | 'off';
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
  if (options.onToggleTemporalNavScrubber != null) {
    const state = options.temporalNavScrubberDevState ?? 'off';
    buttons.push({
      text: `Temporal scrubber (${state})`,
      onPress: options.onToggleTemporalNavScrubber,
    });
  }
  if (options.onPreviewEchoEdgePeek != null) {
    buttons.push({
      text: 'Preview Echo edge peek',
      onPress: () => void options.onPreviewEchoEdgePeek?.(),
    });
  }
  if (options.onResetEchoEdgePeek != null) {
    buttons.push({
      text: 'Reset Echo edge peek flag',
      onPress: () => void options.onResetEchoEdgePeek?.(),
    });
  }
  if (options.onCycleEchoUiVariant != null) {
    const label = options.echoUiVariantDevLabel ?? 'threshold';
    buttons.push({
      text: `Echo UI (${label})`,
      onPress: options.onCycleEchoUiVariant,
    });
  }
  if (options.onToggleStreamBoundedContinuity != null) {
    const state = options.streamBoundedContinuityDevState ?? 'off';
    buttons.push({
      text: `Stream calm scroll (${state})`,
      onPress: options.onToggleStreamBoundedContinuity,
    });
  }
  buttons.push({ text: 'Cancel', style: 'cancel' });
  Alert.alert('Dev menu', undefined, buttons);
}
