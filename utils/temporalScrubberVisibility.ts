import {
  TEMPORAL_NAV_MIN_ENTRY_COUNT,
  TEMPORAL_NAV_MIN_SCROLL_Y,
  TEMPORAL_NAV_SCROLL_VELOCITY_PEEK,
} from '../constants/temporalNavigation';

export function isTemporalScrubberEligible(params: {
  active: boolean;
  /** Recall/search mode — hide temporal rack (not only when query is non-empty). */
  searchActive: boolean;
  /** Thought sheet open — hide rack chrome. */
  readSheetOpen?: boolean;
  totalEntryCount: number;
  hasStreamRows: boolean;
  /** Dev QA: surface the scrubber before `TEMPORAL_NAV_MIN_ENTRY_COUNT`. */
  bypassMinEntryCount?: boolean;
}): boolean {
  if (!params.active || params.searchActive || params.readSheetOpen || !params.hasStreamRows) {
    return false;
  }
  if (params.bypassMinEntryCount) {
    return true;
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

/** Rack chrome: eligible, past capture, and peek gate (scroll depth or velocity). */
export function isTemporalScrubberVisible(params: {
  eligible: boolean;
  atCapture: boolean;
  streamScrollY: number;
  scrollVelocityY: number;
}): boolean {
  return (
    params.eligible &&
    !params.atCapture &&
    shouldPeekTemporalScrubber(params.streamScrollY, params.scrollVelocityY)
  );
}
