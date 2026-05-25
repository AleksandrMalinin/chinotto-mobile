import {
  STREAM_FOCUS_SETTLE_MS,
  STREAM_FOCUS_SKIM_VELOCITY_Y,
} from '../constants/streamBoundedContinuity';

export { STREAM_FOCUS_SETTLE_MS, STREAM_FOCUS_SKIM_VELOCITY_Y };

export function isStreamFocusSkimming(velocityY: number): boolean {
  return Math.abs(velocityY) > STREAM_FOCUS_SKIM_VELOCITY_Y;
}

/**
 * B4: while skimming, keep the last settled active index; when idle, adopt geometry index.
 */
export function resolveSettledActiveFlatIndex(
  geometryActiveIndex: number,
  settledActiveIndex: number,
  velocityY: number,
): number {
  if (geometryActiveIndex < 0) {
    return -1;
  }
  if (isStreamFocusSkimming(velocityY)) {
    return settledActiveIndex >= 0 ? settledActiveIndex : geometryActiveIndex;
  }
  return geometryActiveIndex;
}
