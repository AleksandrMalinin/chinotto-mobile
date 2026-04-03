import { parseDesktopSyncSessionIdFromUrl } from './syncDeepLink';

let stashedDesktopSyncSessionId: string | null = null;

/**
 * Latest `ds` from a sync deep link (desktop QR). Overwrites on each new link.
 * Consumed when mirroring unlock state to Firestore for that session.
 */
export function stashDesktopSyncSessionFromUrlIfPresent(url: string): void {
  const id = parseDesktopSyncSessionIdFromUrl(url);
  if (id != null) {
    stashedDesktopSyncSessionId = id;
  }
}

/** Session id to pass into {@link mirrorChinottoSyncAccessToFirestore} (may be null). */
export function peekDesktopSyncSessionId(): string | null {
  return stashedDesktopSyncSessionId;
}

/** Clears stashed `ds` after a successful `sync_desktop_sessions` write so it is not reused across later mirrors. */
export function clearDesktopSyncSessionId(): void {
  stashedDesktopSyncSessionId = null;
}
