import { motion } from './motion';

/** Production feature gate — Remote Config kill switch later. Off for launch; flip to `true` to ship Echo to everyone. */
export const ECHO_LAYER_ENABLED = false;

/** Runtime gate: off in production until launch, but always on in dev builds for dogfooding. */
export const ECHO_LAYER_ACTIVE = ECHO_LAYER_ENABLED || __DEV__;

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

/** Pixels of Echo page revealed during edge peek hint. */
export const ECHO_EDGE_PEEK_OFFSET_PX = 14;

/** Minimum days between edge peek hints (after the first). */
export const ECHO_EDGE_PEEK_REPEAT_DAYS = 7;

/** Delay before first edge peek after Echo mounts (ms). */
export const ECHO_EDGE_PEEK_INITIAL_DELAY_MS = 900;

/** Composer/search opacity at full Echo reveal (matches search-mode dim). */
export const ECHO_COMPOSER_DIM_AT_FULL = 0.58;

/** Threshold UI — ghost traces beside the primary presence. */
export const ECHO_THRESHOLD_GHOST_COUNT = 2;

/** Entry cannot reappear in Echo within this many days after display. */
export const ECHO_DISPLAY_COOLDOWN_DAYS = 14;

/** Longer hide when opened ≥2× without edit — avoids nagging unfinished reads. */
export const ECHO_DISPLAY_COOLDOWN_OPENED_DAYS = 21;

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

/** Phase B dwell-based pacing — off until Echo dwell telemetry ships. */
export const ECHO_DWELL_RERANK_ENABLED = false;

/** Content fade-in duration after atmosphere crossfade (ms). */
export const ECHO_CONTENT_FADE_MS = motion.echo.contentFade;

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

/** Drag (px) before resistance curve applies — heavy first segment. */
export const ECHO_PALIMPSEST_PEEL_RESIST_FROM_DY = 30;

/** Fraction of drag beyond resist threshold. */
export const ECHO_PALIMPSEST_PEEL_RESIST_FACTOR = 0.6;

/** Primary text crossfade after peel (ms). */
export const ECHO_PALIMPSEST_PEEL_FADE_MS = 140;

/** Echo presence dim when recall sheet is open (0–1). */
export const ECHO_RECALL_SHEET_DIM = 0.42;

/** Echo presence dim in/out (ms). */
export const ECHO_RECALL_DIM_IN_MS = motion.echo.recallDimIn;
export const ECHO_RECALL_DIM_OUT_MS = motion.echo.recallDimOut;

/** Pause before Echo brightens after sheet dismiss (ms). */
export const ECHO_RECALL_DIM_OUT_DELAY_MS = motion.echo.recallDimOutDelay;

/** Palimpsest primary press settle (ms). */
export const ECHO_PALIMPSEST_PRESS_IN_MS = motion.echo.palimpsestPressIn;
export const ECHO_PALIMPSEST_PRESS_OUT_MS = motion.echo.palimpsestPressOut;

/** Horizontal reveal — enter Echo slower than return to stream (ms). */
export const ECHO_PAGER_REVEAL_IN_MS = motion.echo.pagerRevealIn;
export const ECHO_PAGER_REVEAL_OUT_MS = motion.echo.pagerRevealOut;

/** Composer stays full-dim until this fraction of swipe toward stream. */
export const ECHO_COMPOSER_DIM_RELEASE_AT = 0.65;

/** Emotional veil cap multiplier (text proxy only). */
export const ECHO_EMOTIONAL_VEIL_CAP = 0.1;

/** Lift Echo presence slightly above geometric center (pt). */
export const ECHO_VESSEL_OPTICAL_LIFT_PT = 6;

/** Soft land after Echo page settles (ms). */
export const ECHO_PRESENCE_SETTLE_MS = motion.echo.presenceSettle;

/** Palimpsest peel via long press when reduce motion (ms). */
export const ECHO_PALIMPSEST_PEEL_LONG_PRESS_MS = motion.echo.palimpsestPeelLongPress;
