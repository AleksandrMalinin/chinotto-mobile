/**
 * Chinotto mobile theme — mirrors `chinotto-app/docs/design-system.md` §2 (`:root` tokens).
 *
 * Typography (matches live desktop app):
 * - **Open Sauce One** weights **400** and **500** for almost all UI after shell load
 *   (body, capture, stream, search, buttons, settings — same as `index.css` on web).
 * - **Inter** weight **300** is used on desktop **only** for first-run intro copy
 *   (`.intro-screen-copy`). Mobile uses **Open Sauce One** for the one-time welcome as well; Inter is not loaded on mobile.
 *   Nunito / Outfit / Plus Jakarta in `index.html` are unused on web.
 *
 * Font files: `assets/fonts/OpenSauceOne-{Regular,Medium}.ttf` (SIL OFL; keys `OpenSauceOne-400` / `500`).
 */

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
  border: 'rgba(255,255,255,0.07)',
  borderFocus: 'rgba(138,148,200,0.36)',
  accentSubtle: 'rgba(128,138,188,0.08)',
  atmosphereSoft: 'rgba(88,104,168,0.26)',
  glow: 'rgba(90,108,156,0.16)',
  /** Recurring stream body — `.entry-row-text` */
  entryBody: 'rgba(255,255,255,0.9)',
  /** Caret / selection tint (cool lavender; not a separate CSS var in §2 table). */
  accent: 'rgba(160,170,255,0.88)',
  /** Swipe-to-delete track — violet family, not alarm red. */
  swipeDeleteBg: 'rgba(108, 116, 178, 0.48)',
} as const;

/** Light shell — same roles, calm editorial (not marketing chrome). */
export const colorsLight = {
  bg: '#f5f5f7',
  bgElevated: '#ffffff',
  fg: '#1c1c22',
  fgDim: '#5c5c66',
  muted: '#8e8e96',
  sectionFg: 'rgba(0,0,0,0.28)',
  metaFg: 'rgba(0,0,0,0.45)',
  border: 'rgba(0,0,0,0.08)',
  borderFocus: 'rgba(100,110,180,0.42)',
  accentSubtle: 'rgba(100,110,180,0.08)',
  atmosphereSoft: 'rgba(72,88,132,0.08)',
  glow: 'rgba(90,108,156,0.1)',
  entryBody: 'rgba(28,28,34,0.92)',
  accent: 'rgba(90,100,200,0.88)',
  swipeDeleteBg: 'rgba(100, 108, 175, 0.28)',
} as const;

export type ThemeColors = typeof colorsDark | typeof colorsLight;

/** Registered `fontFamily` names from `App.tsx` `useFonts` — Open Sauce One 400 / 500. */
export const fonts = {
  regular: 'OpenSauceOne-400',
  medium: 'OpenSauceOne-500',
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
  isDark: boolean;
  spacing: typeof spacing;
  radius: typeof radius;
  duration: typeof duration;
  typography: typeof typography;
};

export function getTheme(colorScheme: string | null | undefined): AppTheme {
  const isDark = colorScheme !== 'light';
  return {
    colors: isDark ? colorsDark : colorsLight,
    isDark,
    spacing,
    radius,
    duration,
    typography,
  };
}

/**
 * Chinotto matches the desktop shell: dark charcoal (`--bg`). We always use the dark
 * palette so the app looks like the same product regardless of system light/dark.
 * (`app.json` sets `userInterfaceStyle: "dark"` for status bar / native chrome.)
 */
export function useAppTheme(): AppTheme {
  return getTheme('dark');
}
