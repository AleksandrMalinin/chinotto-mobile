import {
  VOICE_MIC_CLUSTER_WIDTH,
} from '../components/VoiceCaptureControl';

/** Gap between the capture field and the trailing mic. */
export const COMPOSER_ACTION_CLUSTER_LEADING_GAP = 6;

/** Voice mic only — search is revealed via pull-down on the stream, not beside capture. */
export const COMPOSER_ACTION_CLUSTER_WIDTH = VOICE_MIC_CLUSTER_WIDTH;

/**
 * Voice mic stays visible whenever voice capture is supported — speak into an empty field
 * or append to existing text (GPT-style); stop with a second tap on the mic.
 */
export function composerActionClusterExpanded(
  _captureText: string,
  _voicePhase: 'idle' | 'listening',
): boolean {
  return true;
}
