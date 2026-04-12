import type { UpdateConfig } from './types';

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/**
 * Parse and validate Remote Config / CDN JSON into {@link UpdateConfig}.
 * Throws if the payload is not a safe, complete policy object.
 */
export function parseUpdateConfigJson(raw: string): UpdateConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error('app_update_config: invalid JSON');
  }
  if (!isRecord(parsed)) {
    throw new Error('app_update_config: expected object');
  }

  const enabled = parsed.enabled;
  if (typeof enabled !== 'boolean') {
    throw new Error('app_update_config: enabled must be boolean');
  }

  const minSupportedVersion = typeof parsed.minSupportedVersion === 'string' ? parsed.minSupportedVersion.trim() : '';
  const latestVersion = typeof parsed.latestVersion === 'string' ? parsed.latestVersion.trim() : '';
  if (!minSupportedVersion || !latestVersion) {
    throw new Error('app_update_config: minSupportedVersion and latestVersion required');
  }

  const forceUpdate = parsed.forceUpdate;
  if (typeof forceUpdate !== 'boolean') {
    throw new Error('app_update_config: forceUpdate must be boolean');
  }

  const title = typeof parsed.title === 'string' ? parsed.title.trim() : undefined;
  const message = typeof parsed.message === 'string' ? parsed.message.trim() : undefined;

  const out: UpdateConfig = {
    enabled,
    minSupportedVersion,
    latestVersion,
    forceUpdate,
  };
  if ('iosStoreUrl' in parsed && typeof parsed.iosStoreUrl === 'string') {
    out.iosStoreUrl = parsed.iosStoreUrl.trim();
  }
  if ('androidStoreUrl' in parsed && typeof parsed.androidStoreUrl === 'string') {
    out.androidStoreUrl = parsed.androidStoreUrl.trim();
  }
  if (title && title.length > 0) {
    out.title = title;
  }
  if (message && message.length > 0) {
    out.message = message;
  }
  return out;
}
