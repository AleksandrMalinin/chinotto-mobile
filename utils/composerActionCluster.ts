/** Outer diameter of the voice mic ring beside capture (must match VoiceCaptureControl). */
export const COMPOSER_VOICE_MIC_OUTER = 42;

/** Gap between the capture field and the trailing mic. */
export const COMPOSER_ACTION_CLUSTER_LEADING_GAP = 6;

/** Voice mic only — search is revealed via pull-down on the stream, not beside capture. */
export const COMPOSER_ACTION_CLUSTER_WIDTH = COMPOSER_VOICE_MIC_OUTER;

/**
 * Trailing mic stays visible on an empty field (discover voice).
 * Once the user is composing text, the mic steps aside — unless voice is active
 * (mic must remain reachable to stop listening).
 */
export function composerActionClusterExpanded(
  captureText: string,
  voicePhase: 'idle' | 'listening',
): boolean {
  return captureText.trim().length === 0 || voicePhase === 'listening';
}
