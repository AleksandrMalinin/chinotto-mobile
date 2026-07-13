import { Platform } from 'react-native';

import { captureInputPaddingTop, typography } from '../theme';

export const MIC_OUTER = 36;
export const MIC_LISTENING_SHADOW_RADIUS = 8;

export const MIC_ALIGN_NUDGE = Platform.select({ ios: -2, default: -3 }) ?? -2;

/** Room beside capture for listening glow (iOS shadow extends outside layout bounds). */
export const VOICE_MIC_CLUSTER_OVERFLOW_PAD_HORIZONTAL = Math.ceil(
  MIC_LISTENING_SHADOW_RADIUS * 0.85,
);

export const VOICE_MIC_CLUSTER_WIDTH =
  MIC_OUTER + 2 * VOICE_MIC_CLUSTER_OVERFLOW_PAD_HORIZONTAL;

/** Vertical offset for the mic ring center on the capture composer’s first line. */
export function captureMicMarginTop(captureLineHeight: number): number {
  return captureInputPaddingTop + captureLineHeight / 2 - MIC_OUTER / 2 + MIC_ALIGN_NUDGE;
}

/** Pad action cluster top so negative mic margin is not clipped. */
export function voiceMicClusterOverflowPadTop(captureLineHeight: number): number {
  return Math.max(0, -captureMicMarginTop(captureLineHeight));
}

/** Default pad for typed capture (`typography.capture`). */
export const VOICE_MIC_CLUSTER_OVERFLOW_PAD_TOP = voiceMicClusterOverflowPadTop(
  typography.capture.lineHeight,
);
