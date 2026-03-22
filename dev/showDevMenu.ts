import { Alert } from 'react-native';

export type DevMenuOptions = {
  onResetWelcome: () => void;
};

/**
 * Extensible dev-only actions (development builds / `__DEV__` only).
 * Trigger from a hidden gesture (e.g. long-press header logo on capture).
 */
export function showDevMenu(options: DevMenuOptions): void {
  if (!__DEV__) {
    return;
  }
  Alert.alert('Dev menu', undefined, [
    {
      text: 'Reset welcome onboarding',
      onPress: options.onResetWelcome,
    },
    { text: 'Cancel', style: 'cancel' },
  ]);
}
