/**
 * Set `EXPO_PUBLIC_ENABLE_PAYWALL=true` in `.env` (or EAS env) to show the Chinotto Plus step
 * before Apple sign-in when the user taps Enable sync.
 */
export function isPaywallEnabled(): boolean {
  return process.env.EXPO_PUBLIC_ENABLE_PAYWALL === 'true';
}
