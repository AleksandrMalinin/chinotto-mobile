/**
 * Stable web host for desktop → mobile QR (universal links). Website must host AASA (see docs).
 */
export const CHINOTTO_SYNC_UNIVERSAL_HOST = 'getchinotto.app' as const;

const SYNC_PATH = '/sync';

function normalizePathname(pathname: string): string {
  if (pathname === '' || pathname === '/') {
    return '/';
  }
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

/**
 * Returns true for the **sync entry** deep link only:
 * - `https://getchinotto.app/sync` (optional `?query`; not `/sync/extra` paths)
 * - `chinotto://sync`, `chinotto:///sync` (custom scheme fallback)
 */
export function isSyncDeepLinkUrl(url: string | null | undefined): boolean {
  if (url == null) {
    return false;
  }
  const trimmed = url.trim();
  if (trimmed === '') {
    return false;
  }
  try {
    const u = new URL(trimmed);
    const host = u.hostname.toLowerCase();
    const path = normalizePathname(u.pathname);

    if (u.protocol === 'https:' && host === CHINOTTO_SYNC_UNIVERSAL_HOST) {
      return path === SYNC_PATH;
    }

    if (u.protocol === 'chinotto:') {
      if (path === SYNC_PATH) {
        return true;
      }
      /* e.g. chinotto://sync — hostname "sync", empty path */
      if (host === 'sync' && (path === '/' || path === '')) {
        return true;
      }
    }
  } catch {
    /* invalid URL */
  }

  return /^chinotto:\/\/?sync\/?(\?.*)?$/i.test(trimmed);
}
