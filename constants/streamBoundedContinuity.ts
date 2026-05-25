/** Dev-only stream psychology experiments (B3 tide, B4 focus settle, B5 soft month jump). */
export const STREAM_BOUNDED_CONTINUITY_ENABLED = false;

/** Freeze viewport focus while |velocityY| exceeds this (px/s, scroll event units). */
export const STREAM_FOCUS_SKIM_VELOCITY_Y = 120;

/** After scroll idle, commit active row highlight (ms). */
export const STREAM_FOCUS_SETTLE_MS = 150;

export const STREAM_TIDE_MAX_ENTRIES = 2;

/** Per-entry minimum gap before the same thought can tide again. */
export const STREAM_TIDE_COOLDOWN_MS = 86_400_000;

/** Background away time before tide may run on resume. */
export const STREAM_TIDE_INTERRUPTION_MS = 20 * 60_000;

/** Tide row entrance (ms). */
export const STREAM_TIDE_ENTRANCE_MS = 120;

/** Tide rows render slightly quieter than neighbors. */
export const STREAM_TIDE_BODY_OPACITY = 0.92;

/** Month section label pulse after temporal jump (ms). */
export const STREAM_MONTH_JUMP_PULSE_MS = 500;

/** Extra top inset when scrolling to a month anchor. */
export const STREAM_MONTH_JUMP_SCROLL_INSET_PX = 8;

/** Run expensive per-row window measures only after scroll idles (ms). */
export const STREAM_VIEWPORT_WINDOW_MEASURE_IDLE_MS = 120;
