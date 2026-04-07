/**
 * When set (e.g. screen recording): native SDK logs are swallowed via `Purchases.setLogHandler`
 * before configure (no default `console.error` → LogBox), log level ERROR, plus our dev `console` hooks
 * stay quiet.
 *
 * Set in `.env`: `EXPO_PUBLIC_REVENUECAT_QUIET=1` — restart Metro (`expo start -c`) after changing.
 * `App.tsx` also registers `LogBox.ignoreLogs` for any stray `[RevenueCat]` lines.
 */
export function isRevenueCatQuietMode(): boolean {
  const v = process.env.EXPO_PUBLIC_REVENUECAT_QUIET?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}
