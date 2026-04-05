'use strict';

/** @param {string | undefined} raw */
function parseEnableSyncPaywall(raw) {
  if (raw == null || raw === '') {
    return false;
  }
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 */
function assertEasPaywallHasProductionRevenueCatIosKey(env = process.env) {
  const eas = String(env.EAS_BUILD ?? '').toLowerCase();
  if (eas !== 'true' && eas !== '1') {
    return;
  }
  if (!parseEnableSyncPaywall(env.EXPO_PUBLIC_ENABLE_PAYWALL)) {
    return;
  }
  const k = (env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? '').trim();
  if (k === '' || k.startsWith('test_')) {
    throw new Error(
      '[Chinotto] EAS build with EXPO_PUBLIC_ENABLE_PAYWALL enabled requires EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ' +
        'set to RevenueCat’s public iOS SDK key (appl_…), not empty and not test_*. ' +
        'Add it under EAS → Environment variables for this build profile (or .env for local EAS).',
    );
  }
}

module.exports = {
  assertEasPaywallHasProductionRevenueCatIosKey,
  parseEnableSyncPaywall,
};
