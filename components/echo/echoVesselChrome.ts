import type { useAppTheme } from '../../theme';
import type { EchoChromeColors } from './echoChrome';

type AppTheme = ReturnType<typeof useAppTheme>;

export const ECHO_FRAGMENT_RADIUS = 14;

export type EchoFragmentChrome = {
  fill: string;
  border: string;
  pressed: string;
};

/** Per-thought fragment surfaces — stacked insets, not one monolithic register. */
export function echoFragmentChrome(t: AppTheme, echo: EchoChromeColors): EchoFragmentChrome {
  return {
    fill: echo.fragmentFill,
    border: echo.fragmentBorder,
    pressed: t.colors.accentSubtle,
  };
}
