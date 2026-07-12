/** Guards for when mobile may schedule a resurface attempt (desktop `mayAttemptResurface` parity). */
export type MobileResurfaceEffectGuards = {
  /** Brand splash handoff complete — capture is the active surface. */
  captureReady: boolean;
  readSheetOpen: boolean;
  searchActive: boolean;
  composerHasDraft: boolean;
  voiceCaptureActive: boolean;
  streamEmpty: boolean;
  triedResurface: boolean;
};

export function mayAttemptMobileResurface(guards: MobileResurfaceEffectGuards): boolean {
  return (
    guards.captureReady &&
    !guards.readSheetOpen &&
    !guards.searchActive &&
    !guards.composerHasDraft &&
    !guards.voiceCaptureActive &&
    !guards.streamEmpty &&
    !guards.triedResurface
  );
}

/** True when `tryResurface` may call the backend. At most one visible resurface per session. */
export function shouldInvokeMobileResurface(
  shownThisSession: boolean,
  resurfaceInFlight: boolean,
): boolean {
  return !shownThisSession && !resurfaceInFlight;
}
