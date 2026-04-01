import Constants from 'expo-constants';

function parsePaywallFlag(raw: string | undefined | null): boolean {
  if (raw == null || raw === '') {
    return false;
  }
  const v = raw.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

type PaywallExtra = { enableSyncPaywall?: boolean };

/**
 * Set `EXPO_PUBLIC_ENABLE_PAYWALL=true` (or `1`) in `.env` / EAS.
 *
 * **Two sources (either can enable the paywall):**
 * 1. `process.env.EXPO_PUBLIC_ENABLE_PAYWALL` — inlined when Metro bundles JS (restart Metro after `.env` changes).
 * 2. `app.config.js` → `extra.enableSyncPaywall` — baked at **native** build from the same env var (`dotenv` loads `.env` when you run `expo run:ios` / prebuild). Rebuild the dev client after changing the flag.
 */
export function isPaywallEnabled(): boolean {
  if (parsePaywallFlag(process.env.EXPO_PUBLIC_ENABLE_PAYWALL)) {
    return true;
  }
  const extra = Constants.expoConfig?.extra as PaywallExtra | undefined;
  return extra?.enableSyncPaywall === true;
}

/** `__DEV__` only: why the paywall might be on or off. */
export function getPaywallDebugInfo(): {
  fromProcessEnv: string | undefined;
  fromExtraEnableSyncPaywall: boolean | undefined;
  isPaywallEnabled: boolean;
} {
  const extra = Constants.expoConfig?.extra as PaywallExtra | undefined;
  return {
    fromProcessEnv: process.env.EXPO_PUBLIC_ENABLE_PAYWALL,
    fromExtraEnableSyncPaywall: extra?.enableSyncPaywall,
    isPaywallEnabled: isPaywallEnabled(),
  };
}
