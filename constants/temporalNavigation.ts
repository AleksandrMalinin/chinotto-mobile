/** Feature gate — Remote Config kill switch later. */
export const TEMPORAL_NAV_ENABLED = true;

/** Show temporal chrome only after this many local thoughts (avoids noise for new users). */
export const TEMPORAL_NAV_MIN_ENTRY_COUNT = 40;

/** Stream scroll Y (px) past which passive month scrubber may appear. */
export const TEMPORAL_NAV_MIN_SCROLL_Y = 120;

/** |velocityY| from scroll event above which scrubber may peek in (px/s, approximate). */
export const TEMPORAL_NAV_SCROLL_VELOCITY_PEEK = 80;

/** Hide scrubber after idle (ms). */
export const TEMPORAL_NAV_SCRUBBER_IDLE_MS = 1200;

/** Vertical snap stride for the month rack (trailing edge). */
export const TEMPORAL_MONTH_RACK_ROW_HEIGHT = 32;

/** Trailing inset — 0 docks flush to the screen edge. */
export const TEMPORAL_TRAILING_CHROME_RIGHT_INSET = 0;

/** Width of the floating month rack plaque. */
export const TEMPORAL_MONTH_RACK_CHROME_WIDTH = 44;

/** Collapsed rack pill height (year + month, bottom-anchored). */
export const TEMPORAL_MONTH_RACK_COMPACT_HEIGHT = 40;

/** Extra bottom inset for compact rack above home indicator (safe area added in screen). */
export const TEMPORAL_RACK_BOTTOM_INSET = 12;

/** Long-press on expanded rack year header to collapse (ms). */
export const TEMPORAL_MONTH_RACK_COMPACT_LONG_PRESS_MS = 450;

/** Max month rows visible in expanded rack before internal scroll. */
export const TEMPORAL_MONTH_RACK_MAX_VISIBLE_ROWS = 5;

/** Year header above the month carousel. */
export const TEMPORAL_MONTH_RACK_YEAR_HEIGHT = 24;

/** Max expanded rack height — year header + capped month viewport. */
export const TEMPORAL_MONTH_RACK_MAX_HEIGHT =
  TEMPORAL_MONTH_RACK_YEAR_HEIGHT +
  TEMPORAL_MONTH_RACK_MAX_VISIBLE_ROWS * TEMPORAL_MONTH_RACK_ROW_HEIGHT;

/** Inner horizontal padding inside the rack plaque. */
export const TEMPORAL_MONTH_RACK_PAD_H = 8;

/** Fade in/out for the whole rack chrome (ms). */
export const TEMPORAL_MONTH_RACK_FADE_MS = 220;
