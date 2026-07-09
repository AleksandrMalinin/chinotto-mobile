import type { useAppTheme } from '../../theme';
import type { EchoCandidateKind } from '../../utils/selectEchoCandidates';
import type { EchoChromeColors } from './echoChrome';
import { echoFragmentBorderForKind } from './echoChrome';

type AppTheme = ReturnType<typeof useAppTheme>;

export const ECHO_FRAGMENT_RADIUS = 14;

export type EchoFragmentChrome = {
  fill: string;
  border: string;
  pressed: string;
};

/** Home depth — slightly brighter register vs stream rows (desktop home-depth-zone). */
export function echoDepthFragmentChrome(
  t: AppTheme,
  echo: EchoChromeColors,
  kind: EchoCandidateKind,
): EchoFragmentChrome {
  const { isDark, sunlightMode } = t;
  const kindBorder = echoFragmentBorderForKind(echo, kind);
  return {
    fill: sunlightMode ? 'rgba(255, 255, 255, 0.09)' : isDark ? 'rgba(255, 255, 255, 0.055)' : 'rgba(255, 255, 255, 0.07)',
    border: kindBorder,
    pressed: isDark ? 'rgba(128, 138, 188, 0.14)' : 'rgba(128, 138, 188, 0.12)',
  };
}

/** Per-thought fragment surfaces — stacked insets, not one monolithic register. */
export function echoFragmentChrome(t: AppTheme, echo: EchoChromeColors): EchoFragmentChrome {
  return {
    fill: echo.fragmentFill,
    border: echo.fragmentBorder,
    pressed: t.colors.accentSubtle,
  };
}
