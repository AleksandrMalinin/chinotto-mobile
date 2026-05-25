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

/** Threshold UI — ghost traces beside the primary presence. */
export const ECHO_THRESHOLD_GHOST_COUNT = 2;

/** Entry cannot reappear in Echo within this many days after display. */
export const ECHO_DISPLAY_COOLDOWN_DAYS = 14;

/** Stem recurrence — minimum days between matching entries. */
export const ECHO_STEM_MIN_GAP_DAYS = 7;

/** Stem window length (words). */
export const ECHO_STEM_MIN_WORDS = 3;

/** Session thread — promote neighbors within this hour window. */
export const ECHO_SESSION_THREAD_HOURS = 2;

/** Unfinished signal — minimum opens without edit. */
export const ECHO_UNFINISHED_OPEN_MIN = 2;

/** Interruption recovery — away longer than this before biasing primary. */
export const ECHO_INTERRUPTION_AWAY_MINUTES = 20;

/** Phase B invisible re-rank — off until on-device model ships. */
export const ECHO_AI_RERANK_ENABLED = false;

/** Content fade-in duration after atmosphere crossfade (ms). */
export const ECHO_CONTENT_FADE_MS = 420;

/** Filament — max stations on the thread (alternate UI; not shipped). */
export const ECHO_FILAMENT_MAX_STATIONS = 4;

/** Field — max visible nodes (alternate UI; not shipped). */
export const ECHO_FIELD_MAX_NODES = 4;

/** Palimpsest — pool size for peel rotation. */
export const ECHO_PALIMPSEST_VISIBLE = 3;

/** Age-only rims above the top card. */
export const ECHO_PALIMPSEST_RIM_COUNT = 2;

/** Vertical drag (px) to commit a peel. */
export const ECHO_PALIMPSEST_PEEK_DY = 44;

/** Peel commit animation (ms) — slow settle, not carousel snap. */
export const ECHO_PALIMPSEST_PEEL_COMMIT_MS = 360;

/** Peel snap target before index advance (px). */
export const ECHO_PALIMPSEST_PEEL_SNAP_DY = 40;

/** Max drag on peel (px). */
export const ECHO_PALIMPSEST_PEEL_DRAG_MAX = 56;

/** Drag (px) before resistance curve applies. */
export const ECHO_PALIMPSEST_PEEL_RESIST_FROM_DY = 24;

/** Fraction of drag beyond resist threshold. */
export const ECHO_PALIMPSEST_PEEL_RESIST_FACTOR = 0.6;

/** Primary text crossfade after peel (ms). */
export const ECHO_PALIMPSEST_PEEL_FADE_MS = 140;

/** Echo presence dim when recall sheet is open (0–1). */
export const ECHO_RECALL_SHEET_DIM = 0.42;

/** Echo presence dim in/out (ms). */
export const ECHO_RECALL_DIM_IN_MS = 220;
export const ECHO_RECALL_DIM_OUT_MS = 280;
