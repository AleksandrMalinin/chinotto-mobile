/**
 * Stable web host for desktop → mobile QR (universal links). Website must host AASA (see docs).
 */
export const CHINOTTO_SYNC_UNIVERSAL_HOST = 'getchinotto.app' as const;

const SYNC_PATH = '/sync';

/** UUID v4 (desktop session id on `?ds=`). Rejects other shapes. */
const DESKTOP_SYNC_SESSION_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidDesktopSyncSessionId(id: string | null | undefined): boolean {
  if (id == null || id === '') {
    return false;
  }
  return DESKTOP_SYNC_SESSION_UUID_RE.test(id.trim());
}

/**
 * Reads optional `ds` from a sync entry URL (HTTPS or `chinotto:` with query).
 * Used so the phone can signal a specific desktop modal session after unlock (Firestore).
 */
export function parseDesktopSyncSessionIdFromUrl(url: string): string | null {
  const trimmed = url.trim();
  if (trimmed === '') {
    return null;
  }
  try {
    const u = new URL(trimmed);
    const ds = u.searchParams.get('ds')?.trim() ?? '';
    return isValidDesktopSyncSessionId(ds) ? ds : null;
  } catch {
    const q = trimmed.indexOf('?');
    if (q < 0) {
      return null;
    }
    const params = new URLSearchParams(trimmed.slice(q + 1));
    const ds = params.get('ds')?.trim() ?? '';
    return isValidDesktopSyncSessionId(ds) ? ds : null;
  }
}

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
