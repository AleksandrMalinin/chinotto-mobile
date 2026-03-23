import { Platform } from 'react-native';

/**
 * Registers widget layout + initial timeline entry. No-op on non-iOS.
 * Call only when `isExperimentalIosHomeWidgetEnabled()` is true (see `useExperimentalIosHomeWidgetRegistration`).
 */
export function registerCaptureHomeWidget(): void {
  if (Platform.OS !== 'ios') {
    return;
  }
  // Metro resolves `captureHomeWidget.ios.tsx` only for iOS bundles.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { captureHomeWidget } = require('./captureHomeWidget.ios') as typeof import('./captureHomeWidget.ios');
  captureHomeWidget.updateSnapshot({});
  captureHomeWidget.reload();
}
