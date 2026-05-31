import {
  STREAM_PULL_SEARCH_COMMIT_PX,
  STREAM_PULL_SEARCH_HINT_PX,
  STREAM_PULL_SEARCH_PROGRESS_RANGE_PX,
  STREAM_PULL_SEARCH_TOP_EPSILON_PX,
} from '../constants/streamPullSearch';

/** True when the drag began at the top of the stream (not while scrolling up from below). */
export function streamPullSearchDragEligibleAtStart(scrollY: number): boolean {
  return scrollY <= STREAM_PULL_SEARCH_TOP_EPSILON_PX;
}

/** 0–1 hint strength while pulling down at the top of the stream. */
export function streamPullSearchProgress(pullPx: number): number {
  if (pullPx <= STREAM_PULL_SEARCH_HINT_PX) {
    return 0;
  }
  const range = STREAM_PULL_SEARCH_PROGRESS_RANGE_PX - STREAM_PULL_SEARCH_HINT_PX;
  return Math.min(1, (pullPx - STREAM_PULL_SEARCH_HINT_PX) / range);
}

/** True when an eligible top drag pulled far enough to enter search recall on release. */
export function streamPullSearchShouldCommitFromGesture(params: {
  dragEligible: boolean;
  maxPullPx: number;
}): boolean {
  return params.dragEligible && params.maxPullPx >= STREAM_PULL_SEARCH_COMMIT_PX;
}

/** @deprecated Prefer {@link streamPullSearchShouldCommitFromGesture} — raw offset alone misfires on bounce. */
export function streamPullSearchShouldCommit(scrollY: number): boolean {
  return scrollY <= -STREAM_PULL_SEARCH_COMMIT_PX;
}
