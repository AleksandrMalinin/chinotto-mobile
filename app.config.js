// @ts-check

const path = require('path');

// Load `.env` for native config (`extra`) — Metro may still inline `EXPO_PUBLIC_*` separately; this keeps paywall flag reliable after `expo run:ios` / prebuild.
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

/** @param {string | undefined} raw */
function parseEnableSyncPaywall(raw) {
  if (raw == null || raw === '') {
    return false;
  }
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

/** @type {import('expo/config').ConfigContext} */
module.exports = () => {
  const { expo } = require('./app.json');

  const includeExperimentalIosHomeWidget =
    process.env.EXPO_PUBLIC_EXPERIMENTAL_IOS_HOME_WIDGET === '1' ||
    process.env.NODE_ENV !== 'production';

  const plugins = expo.plugins.filter((entry) => {
    const id = Array.isArray(entry) ? entry[0] : entry;
    if (id === 'expo-widgets' && !includeExperimentalIosHomeWidget) {
      return false;
    }
    return true;
  });

  return {
    expo: {
      ...expo,
      plugins,
      extra: {
        ...(expo.extra ?? {}),
        /** Mirrors `EXPO_PUBLIC_ENABLE_PAYWALL` at build time — read in `isPaywallEnabled()` via `expo-constants`. */
        enableSyncPaywall: parseEnableSyncPaywall(process.env.EXPO_PUBLIC_ENABLE_PAYWALL),
      },
    },
  };
};
