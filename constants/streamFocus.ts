import { motion } from './motion';

/** Cross-fade when stream viewport highlight moves (ms); 0 when reduce-motion. */
export const STREAM_FOCUS_OPACITY_DURATION_MS = motion.stream.focusOpacity;

/** Instant focus opacity during scroll, pagination, or list mutations. */
export const STREAM_FOCUS_OPACITY_SNAP_MS = motion.stream.focusOpacitySnap;

export function streamFocusOpacityDurationMs(
  reduceMotion: boolean,
  snap: boolean,
): number {
  if (reduceMotion || snap) {
    return STREAM_FOCUS_OPACITY_SNAP_MS;
  }
  return STREAM_FOCUS_OPACITY_DURATION_MS;
}

/** Stream row press shade fade (ms). */
export const STREAM_ROW_PRESS_IN_MS = motion.stream.pressIn;
export const STREAM_ROW_PRESS_OUT_MS = motion.stream.pressOut;

/** Throttle CaptureScreen streamScrollY state (ms) — focus geometry, not every frame. */
export const STREAM_SCROLL_STATE_THROTTLE_MS = motion.stream.scrollStateThrottle;

/** |velocity.y| above this → snap focus opacity (no cross-fade while scrolling). */
export const STREAM_FOCUS_SCROLL_SNAP_VELOCITY = motion.stream.focusSnapVelocity;

/** Start load-more snap this far from content end (pairs with SCROLL_END_THRESHOLD_PX). */
export const STREAM_LOAD_MORE_LOOKAHEAD_PX = motion.stream.loadMoreLookahead;

export {
  motion as streamMotion,
};
