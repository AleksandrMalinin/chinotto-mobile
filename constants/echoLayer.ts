/** Feature gate — Remote Config kill switch later. */
export const ECHO_LAYER_ENABLED = true;

/** Show echo layer only after this many local thoughts (avoids noise for new users). */
export const ECHO_LAYER_MIN_ENTRY_COUNT = 40;

/** Minimum scored candidates before the echo page mounts. */
export const ECHO_LAYER_MIN_CANDIDATES = 3;

/** Hard cap on echo rows — not a scrollable feed. */
export const ECHO_LAYER_MAX_ITEMS = 7;

/** Gravity scoring window — recent revisits. */
export const ECHO_GRAVITY_RECENT_DAYS = 14;

/** Drift scoring — thoughts older than this may resurface. */
export const ECHO_DRIFT_MIN_AGE_DAYS = 30;

/** Pixels of Echo page revealed during the one-time edge peek. */
export const ECHO_EDGE_PEEK_OFFSET_PX = 14;

/** Composer/search opacity at full Echo reveal (matches search-mode dim). */
export const ECHO_COMPOSER_DIM_AT_FULL = 0.58;
