/**
 * iOS home screen widget via `expo-widgets` (Expo alpha).
 * Enabled only when EXPO_PUBLIC_EXPERIMENTAL_IOS_HOME_WIDGET=1 so JS/runtime logic
 * matches native plugin inclusion from app.config.js.
 *
 * Prebuild: `app.config.js` strips the expo-widgets plugin when this is false so the
 * widget extension is not shipped.
 */
export function isExperimentalIosHomeWidgetEnabled(): boolean {
  return process.env.EXPO_PUBLIC_EXPERIMENTAL_IOS_HOME_WIDGET === '1';
}
