/**
 * iOS home screen widget via `expo-widgets` (Expo alpha). Off in production store builds
 * unless EXPO_PUBLIC_EXPERIMENTAL_IOS_HOME_WIDGET=1 (e.g. internal TestFlight).
 *
 * Prebuild: `app.config.js` strips the expo-widgets plugin when this is false so the
 * widget extension is not shipped.
 */
export function isExperimentalIosHomeWidgetEnabled(): boolean {
  if (__DEV__) {
    return true;
  }
  return process.env.EXPO_PUBLIC_EXPERIMENTAL_IOS_HOME_WIDGET === '1';
}
