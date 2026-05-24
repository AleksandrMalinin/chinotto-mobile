import { Platform, type ViewStyle } from 'react-native';

import type { useAppTheme } from '../../theme';
import type { EchoChromeColors } from './echoChrome';

type AppTheme = ReturnType<typeof useAppTheme>;

export const ECHO_VESSEL_RADIUS = 18;

export type EchoVesselChrome = {
  fill: string;
  separator: string;
  rowPressed: string;
  shadow: ViewStyle;
};

/** Single inset-grouped register — solid fill, no page-edge blur clip. */
export function echoVesselChrome(t: AppTheme, _echo: EchoChromeColors): EchoVesselChrome {
  const { isDark, colors } = t;

  return {
    fill: colors.surfaceSearch,
    separator: colors.streamDivider,
    rowPressed: colors.accentSubtle,
    shadow:
      Platform.OS === 'ios'
        ? {
            shadowColor: isDark ? 'rgba(70, 82, 130, 0.85)' : 'rgba(60, 70, 120, 0.35)',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: isDark ? 0.16 : 0.08,
            shadowRadius: 14,
          }
        : { elevation: 2 },
  };
}
