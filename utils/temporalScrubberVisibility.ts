import {
  TEMPORAL_NAV_MIN_ENTRY_COUNT,
  TEMPORAL_NAV_MIN_SCROLL_Y,
  TEMPORAL_NAV_SCROLL_VELOCITY_PEEK,
} from '../constants/temporalNavigation';

export function isTemporalScrubberEligible(params: {
  active: boolean;
  searchActive: boolean;
  /** Thought sheet open — hide rack chrome. */
  readSheetOpen?: boolean;
  totalEntryCount: number;
  hasStreamRows: boolean;
}): boolean {
  if (!params.active || params.searchActive || params.readSheetOpen || !params.hasStreamRows) {
    return false;
  }
  return params.totalEntryCount >= TEMPORAL_NAV_MIN_ENTRY_COUNT;
}

/**
 * Passive scrubber may peek in while exploring the stream — never at capture (top).
 * Velocity peek only applies below the depth gate when the user is moving deeper into history.
 */
export function shouldPeekTemporalScrubber(streamScrollY: number, scrollVelocityY: number): boolean {
  if (streamScrollY >= TEMPORAL_NAV_MIN_SCROLL_Y) {
    return true;
  }
  if (streamScrollY <= 32 || scrollVelocityY <= 0) {
    return false;
  }
  return scrollVelocityY >= TEMPORAL_NAV_SCROLL_VELOCITY_PEEK;
}
