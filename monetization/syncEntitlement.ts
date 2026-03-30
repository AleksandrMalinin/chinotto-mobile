/**
 * Deprecated compatibility shim.
 * New code should import from `syncAccessPolicy.ts`.
 */
import { hasSyncAccess, isSyncAccessBlocked } from './syncAccessPolicy';

/** @deprecated Use `hasSyncAccess` from `syncAccessPolicy.ts`. */
export function isPremiumUser(): boolean {
  return hasSyncAccess();
}

/** @deprecated Use `isSyncAccessBlocked` from `syncAccessPolicy.ts`. */
export function isSyncBlockedByPaywall(): boolean {
  return isSyncAccessBlocked();
}
