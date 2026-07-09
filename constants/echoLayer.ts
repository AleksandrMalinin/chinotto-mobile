import { motion } from './motion';

/** Production feature gate — Remote Config kill switch later. */
export const ECHO_LAYER_ENABLED = false;

/** Runtime gate: production follows `ECHO_LAYER_ENABLED`; dev is always on for dogfooding. */
export const ECHO_LAYER_ACTIVE = ECHO_LAYER_ENABLED || __DEV__;

/** Show echo recall only after this many local thoughts (avoids noise for new users). */
export const ECHO_LAYER_MIN_ENTRY_COUNT = 8;

/** Minimum scored candidates before home depth recall mounts. */
export const ECHO_LAYER_MIN_CANDIDATES = 1;

/** Hard cap on echo rows — not a scrollable feed. */
export const ECHO_LAYER_MAX_ITEMS = 1;

/** Desktop-aligned show probability when a recall candidate exists. */
export const RESURFACE_SHOW_PROBABILITY = 0.65;

/** Gravity scoring window — recent revisits. */
export const ECHO_GRAVITY_RECENT_DAYS = 14;

/** Drift scoring — thoughts older than this may resurface. */
export const ECHO_DRIFT_MIN_AGE_DAYS = 30;

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

/** Echo presence dim when recall sheet is open (0–1). */
export const ECHO_RECALL_SHEET_DIM = 0.42;

/** Echo presence dim in/out (ms). */
export const ECHO_RECALL_DIM_IN_MS = motion.echo.recallDimIn;
export const ECHO_RECALL_DIM_OUT_MS = motion.echo.recallDimOut;

/** Pause before Echo brightens after sheet dismiss (ms). */
export const ECHO_RECALL_DIM_OUT_DELAY_MS = motion.echo.recallDimOutDelay;

/** Lift Echo card slightly above geometric center (pt). */
export const ECHO_VESSEL_OPTICAL_LIFT_PT = 6;
