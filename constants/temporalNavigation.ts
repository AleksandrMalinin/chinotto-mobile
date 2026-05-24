/** Feature gate — dev menu can still override in __DEV__; Remote Config later. */
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

/** Trailing inset for month rack + Write peek (aligned on the right edge). */
export const TEMPORAL_TRAILING_CHROME_RIGHT_INSET = 8;

/** Width of the floating month rack plaque and Write peek button. */
export const TEMPORAL_MONTH_RACK_CHROME_WIDTH = 52;

/** Max visible height of the rack plaque. */
export const TEMPORAL_MONTH_RACK_MAX_HEIGHT = 268;

/** Inner horizontal padding inside the rack plaque. */
export const TEMPORAL_MONTH_RACK_PAD_H = 10;

/** Fade in/out for the whole rack chrome (ms). */
export const TEMPORAL_MONTH_RACK_FADE_MS = 220;
