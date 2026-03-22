/**
 * Native iOS splash (`expo-splash-screen` `imageWidth`, fixed constraints plugin) and
 * BrandSplash must use the same value so the mark stays aligned at handoff.
 */
export const SPLASH_LOGO_SIZE_PTS = 120;

/** Splash SVG / PNG uses 2.5; keep BrandSplash vector aligned for a seamless crossfade. */
export const SPLASH_LOGO_STROKE_PTS = 2.5;
