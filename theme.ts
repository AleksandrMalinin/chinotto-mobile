/**
 * Chinotto mobile theme — mirrors `chinotto-app/docs/design-system.md` §2 (`:root` tokens).
 *
 * Typography (matches live desktop app):
 * - **Open Sauce One** weights **400** and **500** for almost all UI after shell load
 *   (body, capture, stream, search, buttons, settings — same as `index.css` on web).
 * - **Inter** weight **300** is used on desktop **only** for first-run intro copy
 *   (`.intro-screen-copy`). Mobile uses **Open Sauce One** for capture and stream copy; Inter is not loaded on mobile.
 *   Nunito / Outfit / Plus Jakarta in `index.html` are unused on web.
 *
 * Font files: `assets/fonts/OpenSauceOne-{Regular,Medium}.ttf` (SIL OFL; keys `OpenSauceOne-400` / `500`).
 */

import { createContext, useContext, useMemo } from 'react';

import type { DisplayChromePreference } from './storage/displayChromePrefs';
import { blendColorPair } from './theme/colorBlend';

export type { DisplayChromePreference };

/** Dark shell — values from design-system.md “Colors” table + recurring body opacity. */
export const colorsDark = {
  bg: '#0a0a0e',
  bgElevated: '#0f0f14',
  fg: '#e4e4e9',
  fgDim: '#9b9fa9',
  muted: '#5d6068',
  /** Section labels — `--section-fg` */
  sectionFg: 'rgba(255,255,255,0.32)',
  /** Timestamps, metadata — `--meta-fg` */
  metaFg: 'rgba(255,255,255,0.55)',
  /** Chinotto mark in top headers (slightly brighter/lavender than meta, still calm). */
  logoMark: 'rgba(198,206,255,0.9)',
  /** Capture composer placeholder — slightly quieter than `metaFg`. */
  capturePlaceholder: 'rgba(255,255,255,0.48)',
  border: 'rgba(255,255,255,0.07)',
  borderFocus: 'rgba(138,148,200,0.36)',
  accentSubtle: 'rgba(128,138,188,0.08)',
  atmosphereSoft: 'rgba(88,104,168,0.26)',
  glow: 'rgba(90,108,156,0.16)',
  /** Whisper lift for search capsule (standard dark). */
  surfaceSearch: 'rgba(255,255,255,0.015)',
  /** Search capsule outline (idle); focus uses stronger hairline in `CaptureScreen`. */
  searchBorder: 'rgba(255,255,255,0.05)',
  /** Stream row hairlines — aligns with `border` in default dark. */
  streamDivider: 'rgba(255,255,255,0.07)',
  /** Search field placeholder (standard dark). */
  searchPlaceholder: 'rgba(255,255,255,0.45)',
  /** Recurring stream body — `.entry-row-text` */
  entryBody: 'rgba(255,255,255,0.9)',
  /** Caret / selection tint (cool lavender; not a separate CSS var in §2 table). */
  accent: 'rgba(160,170,255,0.88)',
  /** Swipe-to-delete track — violet family, not alarm red. */
  swipeDeleteBg: 'rgba(108, 116, 178, 0.48)',
  /** Settings rows that need attention (e.g. Delete Account) — dusty peach (aligned with headline gradient warmth), not yellow warning or alarm red. */
  settingsCautionLabel: 'rgba(228, 198, 182, 0.99)',
  settingsCautionBorder: 'rgba(228, 198, 182, 0.42)',
  settingsCautionFill: 'rgba(228, 198, 182, 0.1)',
  /**
   * Delete Account primary CTA — deep warm plum (quietly dangerous; not system alert red).
   * Distinct from `settingsCautionFill` row tint so the irreversible action reads heavier.
   */
  accountDeletionPrimaryFill: 'rgba(52, 28, 32, 0.96)',
  accountDeletionPrimaryBorder: 'rgba(196, 132, 122, 0.42)',
  accountDeletionPrimaryLabel: 'rgba(255, 236, 228, 0.98)',
  /** Irreversible confirm in delete-account modal only — warmer / higher-chroma than `accountDeletionPrimary*`. */
  accountDeletionConfirmFill: 'rgba(112, 44, 52, 0.94)',
  accountDeletionConfirmBorder: 'rgba(255, 168, 150, 0.58)',
  accountDeletionConfirmLabel: 'rgba(255, 252, 248, 1)',
} as const;

/**
 * Sunlight legibility palette — high-contrast dark (not a light theme). Blended in when adaptive
 * brightness reports a bright screen ({@link theme/adaptiveBrightness}).
 */
export const colorsSunlight = {
  /**
   * Neutral-warm charcoal — pairs with cooler `bgElevated` / search so layers read by temperature,
   * not higher luminance.
   */
  bg: '#13121c',
  /** Cool blue-slate lift — subtle hue separation from `bg`. */
  bgElevated: '#1d2130',
  /** Primary — capture / stream lead. */
  fg: '#ffffff',
  /** Secondary body / labels. */
  fgDim: 'rgba(255,255,255,0.84)',
  /** Timestamps (paired with medium weight in RecentList). */
  muted: 'rgba(255,255,255,0.72)',
  sectionFg: 'rgba(255,255,255,0.78)',
  metaFg: 'rgba(255,255,255,0.78)',
  logoMark: 'rgba(214,220,255,0.94)',
  capturePlaceholder: 'rgba(255,255,255,0.72)',
  border: 'rgba(255,255,255,0.26)',
  borderFocus: 'rgba(200,208,255,0.72)',
  accentSubtle: 'rgba(100,110,175,0.22)',
  atmosphereSoft: 'rgba(88,100,150,0.12)',
  glow: 'rgba(110,125,180,0.14)',
  streamDivider: 'rgba(120,140,255,0.12)',
  /** Cool-tinted fill — reads slightly bluer than the warm-neutral `bg`. */
  surfaceSearch: 'rgba(102,118,198,0.14)',
  searchBorder: 'rgba(180,200,255,0.18)',
  searchPlaceholder: 'rgba(255,255,255,0.72)',
  entryBody: '#ffffff',
  accent: 'rgba(220,226,255,1)',
  swipeDeleteBg: 'rgba(72, 78, 118, 0.72)',
  settingsCautionLabel: 'rgba(248, 222, 206, 0.98)',
  settingsCautionBorder: 'rgba(248, 222, 206, 0.52)',
  settingsCautionFill: 'rgba(248, 222, 206, 0.14)',
  accountDeletionPrimaryFill: 'rgba(64, 34, 38, 0.94)',
  accountDeletionPrimaryBorder: 'rgba(220, 168, 156, 0.48)',
  accountDeletionPrimaryLabel: 'rgba(255, 244, 238, 1)',
  accountDeletionConfirmFill: 'rgba(100, 40, 48, 0.93)',
  accountDeletionConfirmBorder: 'rgba(255, 200, 186, 0.62)',
  accountDeletionConfirmLabel: 'rgba(255, 255, 255, 1)',
} as const;

/** Light shell — same roles, calm editorial (not marketing chrome). Reserved; shell stays dark-family in normal use. */
export const colorsLight = {
  bg: '#f5f5f7',
  bgElevated: '#ffffff',
  fg: '#1c1c22',
  fgDim: '#5c5c66',
  muted: '#8e8e96',
  sectionFg: 'rgba(0,0,0,0.28)',
  metaFg: 'rgba(0,0,0,0.45)',
  logoMark: 'rgba(96,108,188,0.74)',
  capturePlaceholder: 'rgba(0,0,0,0.38)',
  border: 'rgba(0,0,0,0.08)',
  borderFocus: 'rgba(100,110,180,0.42)',
  accentSubtle: 'rgba(100,110,180,0.08)',
  atmosphereSoft: 'rgba(72,88,132,0.08)',
  glow: 'rgba(90,108,156,0.1)',
  surfaceSearch: 'rgba(0,0,0,0.03)',
  searchBorder: 'rgba(0,0,0,0.07)',
  streamDivider: 'rgba(0,0,0,0.08)',
  searchPlaceholder: 'rgba(0,0,0,0.45)',
  entryBody: 'rgba(28,28,34,0.92)',
  accent: 'rgba(90,100,200,0.88)',
  swipeDeleteBg: 'rgba(100, 108, 175, 0.28)',
  settingsCautionLabel: 'rgba(158, 88, 68, 0.94)',
  settingsCautionBorder: 'rgba(158, 88, 68, 0.38)',
  settingsCautionFill: 'rgba(158, 88, 68, 0.1)',
  accountDeletionPrimaryFill: 'rgba(124, 52, 44, 0.2)',
  accountDeletionPrimaryBorder: 'rgba(124, 52, 44, 0.48)',
  accountDeletionPrimaryLabel: 'rgba(108, 44, 36, 0.98)',
  accountDeletionConfirmFill: 'rgba(180, 58, 48, 0.24)',
  accountDeletionConfirmBorder: 'rgba(200, 72, 58, 0.58)',
  accountDeletionConfirmLabel: 'rgba(118, 36, 28, 1)',
} as const;

export type ThemeColors = typeof colorsDark | typeof colorsSunlight | typeof colorsLight;

/** Adaptive shell: `normal` is default dark; `sunlight` is high-readability chrome from brightness. */
export type ChromeMode = 'normal' | 'sunlight';

type DarkSunKey = keyof typeof colorsDark & keyof typeof colorsSunlight;

function blendDarkSunChrome(progress: number): ThemeColors {
  const t = Math.min(1, Math.max(0, progress));
  if (t <= 0) {
    return colorsDark;
  }
  if (t >= 1) {
    return colorsSunlight;
  }
  const keys = Object.keys(colorsDark) as DarkSunKey[];
  const blended = {} as Record<DarkSunKey, string>;
  for (const k of keys) {
    blended[k] = blendColorPair(colorsDark[k], colorsSunlight[k], t);
  }
  return blended as unknown as ThemeColors;
}

/** Registered `fontFamily` names from `App.tsx` `useFonts` — Open Sauce One 400 / 500. */
export const fonts = {
  regular: 'OpenSauceOne-400',
  medium: 'OpenSauceOne-500',
} as const;

/**
 * Matches `chinotto-app` `index.css` `--chinotto-headline-text-gradient` (`.stream-empty-title`, intro lines).
 * Used with `MaskedView` + `LinearGradient` on RN (no `background-clip: text`).
 */
export const chinottoHeadlineTextGradient = {
  colors: [
    'rgba(255, 255, 255, 0.96)',
    'rgba(198, 206, 255, 0.92)',
    'rgba(255, 255, 255, 0.9)',
    'rgba(255, 220, 200, 0.82)',
  ],
  locations: [0, 0.38, 0.72, 1] as const,
  start: { x: 0.12, y: 0 } as const,
  end: { x: 0.88, y: 1 } as const,
} as const;

/** 8px grid; aligns with design-system.md “Spacing scale” (1rem ≈ 16px, 32px rhythm). */
export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

/** Horizontal inset for the main shell (mobile capture surface). */
export function screenContentGutter(_width: number): number {
  return 20;
}

/**
 * Extra horizontal inset **inside** `screenContentGutter` for the capture composer only (search and
 * section labels use the gutter line). Stream row text uses the same inset so entries line up with
 * the composer.
 */
export const screenContentInnerPad = 12;

/** From design-system.md “Radius scale” (search 12px, entry row 8px). */
export const radius = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
} as const;

/** `--transition: 180ms ease-out`; row/hover often 220ms in CSS. */
export const duration = {
  standard: 180,
  relaxed: 220,
} as const;

/**
 * RN: one font file per weight → set `fontFamily` to the loaded name; avoid stacking `fontWeight`
 * with custom fonts on Android.
 */
export const typography = {
  capture: {
    fontFamily: fonts.medium,
    fontSize: 18,
    letterSpacing: 0.18,
    lineHeight: 26,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  meta: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
} as const;

/** Must match vertical padding on the capture `TextInput` (`CaptureInput`). Used for mic alignment. */
export const captureInputPaddingTop = 6;
export const captureInputPaddingBottom = 8;

export type AppTheme = {
  colors: ThemeColors;
  /** Resolved adaptive mode from brightness (matches `sunlightMode` after blend crosses midpoint). */
  mode: ChromeMode;
  /**
   * Semantic dark chrome — always true for the shipped shell (standard dark or sunlight).
   * Branches that picked “light marketing” colors are unused at runtime.
   */
  isDark: boolean;
  /** True when adaptive blend is at or past the midpoint (sunlight legibility chrome). */
  sunlightMode: boolean;
  /**
   * Same as {@link AdaptiveChromeContext} `blendProgress` — use for gradual ambient/gradient
   * crossfade (colors already interpolate via {@link resolveAppTheme}).
   */
  blendProgress: number;
  spacing: typeof spacing;
  radius: typeof radius;
  duration: typeof duration;
  typography: typeof typography;
};

/**
 * Set by root `App`: animated 0–1 blend between {@link colorsDark} and {@link colorsSunlight}.
 * Default matches tests and storybook-style renders without a provider.
 */
export type AdaptiveChromeContextValue = {
  /** Effective 0–1 blend after optional display override. */
  blendProgress: number;
  displayChrome: DisplayChromePreference;
  setDisplayChrome: (next: DisplayChromePreference) => void;
};

export const AdaptiveChromeContext = createContext<AdaptiveChromeContextValue>({
  blendProgress: 0,
  displayChrome: 'auto',
  setDisplayChrome: () => {},
});

/**
 * `blendProgress` 0 = normal dark, 1 = full sunlight palette (may ease over ~280ms in the shell).
 */
export function resolveAppTheme(blendProgress: number): AppTheme {
  const t = Math.min(1, Math.max(0, blendProgress));
  const mode: ChromeMode = t >= 0.5 ? 'sunlight' : 'normal';
  return {
    colors: blendDarkSunChrome(t),
    mode,
    isDark: true,
    sunlightMode: mode === 'sunlight',
    blendProgress: t,
    spacing,
    radius,
    duration,
    typography,
  };
}

/** Baseline dark chrome (no sunlight blend). */
export function getTheme(): AppTheme {
  return resolveAppTheme(0);
}

/** Live theme from {@link AdaptiveChromeContext} `blendProgress` (includes user display override). */
export function useAppTheme(): AppTheme {
  const { blendProgress } = useContext(AdaptiveChromeContext);
  return useMemo(() => resolveAppTheme(blendProgress), [blendProgress]);
}
