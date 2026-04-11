/**
 * Enable sync label shimmer — contextual highlight, not promotion.
 * Tuned for subtle, rare impressions; see `syncHighlightEligibility.ts`.
 */

/** Lifetime cap per device before sync is enabled. */
export const SYNC_HIGHLIGHT_MAX_IMPRESSIONS = 5;

/** Minimum time between shimmer runs (ms). */
export const SYNC_HIGHLIGHT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** Relevance: at least this many saved thoughts. */
export const SYNC_HIGHLIGHT_MIN_THOUGHTS = 3;

/**
 * Base gate: never shimmer on the first cold launch (after increment, count === 1).
 * Session 2+ may evaluate further (relevance still required).
 */
export const SYNC_HIGHLIGHT_MIN_SESSIONS_NOT_FIRST_LAUNCH = 2;

/**
 * Opens-only relevance: third session can qualify without thoughts/engagement.
 * (Distinguishes “not first launch” from “came back enough” — avoids empty 2nd session shimmer.)
 */
export const SYNC_HIGHLIGHT_RELEVANCE_MIN_APP_LAUNCHES = 3;

/** Stream scroll offset (px) that counts as meaningful engagement. */
export const SYNC_HIGHLIGHT_STREAM_SCROLL_DEPTH_PX = 420;

/** Calm delay after eligibility turns true before playing shimmer (ms). */
export const SYNC_HIGHLIGHT_SCHEDULE_DELAY_MS = 3200;
