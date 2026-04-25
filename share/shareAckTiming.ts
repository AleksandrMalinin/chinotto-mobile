export type AppPhaseForShareAck = 'boot' | 'brand' | 'main';

/**
 * Share-in save can finish while the brand splash overlay is still visible.
 * Toast + a11y announcement should only surface once capture is the foreground experience (`main`).
 */
export function shouldShowShareSavedAck(
  phase: AppPhaseForShareAck,
  pending: boolean,
  ackVisible: boolean
): boolean {
  return (phase === 'main' && pending) || (phase === 'main' && ackVisible);
}

export function shouldDeferShareAck(phase: AppPhaseForShareAck): boolean {
  return phase !== 'main';
}
