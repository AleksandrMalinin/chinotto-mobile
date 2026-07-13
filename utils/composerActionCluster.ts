import {
  VOICE_MIC_CLUSTER_WIDTH,
} from '../components/VoiceCaptureControl';

/** Gap between the capture field and the trailing mic. */
export const COMPOSER_ACTION_CLUSTER_LEADING_GAP = 6;

/** Voice mic only — search is revealed via pull-down on the stream, not beside capture. */
export const COMPOSER_ACTION_CLUSTER_WIDTH = VOICE_MIC_CLUSTER_WIDTH;

/**
 * Empty field: show mic. Typing: step aside for the full row. Listening: keep mic reachable.
 */
export function composerActionClusterExpanded(
  captureText: string,
  voicePhase: 'idle' | 'listening',
): boolean {
  if (voicePhase === 'listening') {
    return true;
  }
  return captureText.trim().length === 0;
}
