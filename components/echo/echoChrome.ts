import type { EchoCandidateKind } from '../../utils/selectEchoCandidates';
import type { AppTheme } from '../../theme';

/** Echo-specific chrome — plum memory register vs stream's blue-violet ambient. */
export type EchoChromeColors = {
  /** Stream shell bg — feather start at stack top (under header). */
  streamFeather: string;
  /** Opaque page base — avoids transparent holes over stream ambient. */
  shellBase: string;
  /** Full-page wash layers. */
  shellTop: string;
  shellMid: string;
  shellBottom: string;
  fragmentFill: string;
  fragmentBorder: string;
  /** Silent warm vs cool fragment edge — persistence register, not a label. */
  fragmentBorderGravity: string;
  fragmentBorderDrift: string;
  /** Gravity (revisited) vs drift — silent tone, no kind labels. */
  fragmentBodyGravity: string;
  fragmentBodyDrift: string;
  gravityAccent: string;
  driftAccent: string;
  headline: string;
  subtitle: string;
  metaMuted: string;
  fragmentBody: string;
  footerHint: string;
  /** Plum memory wash — redder violet than stream's blue-violet ambient. */
  echoVeil: string;
  /** Dusk depth under the wash — separates Echo register without brown. */
  echoDepth: string;
  /** Gentle plum gradient stops — light atmosphere on the memory register. */
  echoGradientTop: string;
  echoGradientBottom: string;
};

/** Resolve echo palette from the live app theme (not a separate light mode). */
export function echoChromeFromTheme(t: AppTheme): EchoChromeColors {
  const { colors, sunlightMode, isDark } = t;

  return {
    streamFeather: colors.bg,
    shellBase: colors.bg,
    shellTop: sunlightMode ? 'rgba(102, 118, 198, 0.06)' : 'rgba(100, 118, 185, 0.07)',
    shellMid: sunlightMode ? 'rgba(140, 148, 210, 0.04)' : 'rgba(88, 104, 168, 0.05)',
    shellBottom: sunlightMode ? 'rgba(88, 98, 140, 0.06)' : 'rgba(75, 98, 155, 0.06)',
    fragmentFill: sunlightMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.035)',
    fragmentBorder: colors.searchBorder,
    fragmentBorderGravity: sunlightMode
      ? 'rgba(198, 206, 255, 0.16)'
      : isDark
        ? 'rgba(160, 170, 220, 0.14)'
        : 'rgba(140, 150, 210, 0.12)',
    fragmentBorderDrift: sunlightMode
      ? 'rgba(170, 188, 255, 0.08)'
      : isDark
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(255, 255, 255, 0.07)',
    fragmentBodyGravity: colors.entryBody,
    fragmentBodyDrift: colors.fgDim,
    /** Present / revisited — lavender mark tone. */
    gravityAccent: colors.logoMark,
    /** Drift — quieter cool accent. */
    driftAccent: isDark ? 'rgba(158, 168, 220, 0.72)' : 'rgba(178, 188, 238, 0.78)',
    headline: colors.fg,
    subtitle: colors.fgDim,
    metaMuted: colors.metaFg,
    fragmentBody: colors.entryBody,
    footerHint: colors.muted,
    /** Stream ≈ blue-violet (118,185); echo ≈ plum (88,152) for visible spatial crossfade. */
    echoVeil: sunlightMode ? 'rgba(140, 108, 175, 0.17)' : 'rgba(112, 88, 152, 0.19)',
    echoDepth: sunlightMode ? 'rgba(36, 28, 52, 0.07)' : 'rgba(8, 6, 18, 0.11)',
    echoGradientTop: sunlightMode ? 'rgba(148, 118, 188, 0.16)' : 'rgba(140, 110, 185, 0.20)',
    echoGradientBottom: sunlightMode ? 'rgba(72, 58, 98, 0.13)' : 'rgba(52, 40, 78, 0.17)',
  };
}

export function echoAccentForKind(chrome: EchoChromeColors, kind: EchoCandidateKind): string {
  return kind === 'gravity' ? chrome.gravityAccent : chrome.driftAccent;
}

/** Warm vs cool fragment edge — no dot, no badge. */
export function echoFragmentBorderForKind(
  chrome: EchoChromeColors,
  kind: EchoCandidateKind,
): string {
  return kind === 'gravity' ? chrome.fragmentBorderGravity : chrome.fragmentBorderDrift;
}

/** @deprecated Use {@link echoChromeFromTheme}. Kept for tests that pass isDark only. */
export function echoChromeColors(isDark: boolean): EchoChromeColors {
  return echoChromeFromTheme({
    colors: {
      bg: isDark ? '#0a0a0e' : '#13121c',
      fg: isDark ? 'rgba(255, 248, 240, 0.94)' : 'rgba(255, 255, 255, 0.96)',
      fgDim: isDark ? 'rgba(255, 255, 255, 0.72)' : 'rgba(255, 255, 255, 0.78)',
      metaFg: isDark ? 'rgba(255, 255, 255, 0.58)' : 'rgba(255, 255, 255, 0.65)',
      logoMark: 'rgba(198,206,255,0.9)',
      entryBody: isDark ? 'rgba(255, 255, 255, 0.9)' : '#ffffff',
      muted: isDark ? 'rgba(255, 255, 255, 0.42)' : 'rgba(255, 255, 255, 0.48)',
      accentSubtle: 'rgba(128,138,188,0.08)',
      searchBorder: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.07)',
      streamDivider: 'rgba(255,255,255,0.07)',
    },
    isDark,
    sunlightMode: false,
    blendProgress: 0,
  } as Parameters<typeof echoChromeFromTheme>[0]);
}
