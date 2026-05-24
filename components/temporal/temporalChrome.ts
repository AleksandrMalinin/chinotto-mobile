import { Platform, type ViewStyle } from 'react-native';

import type { useAppTheme } from '../../theme';

type AppTheme = ReturnType<typeof useAppTheme>;

export type TemporalChromeColors = {
  rackSurface: string;
  rackBorder: string;
  rackBorderActive: string;
  rackFadeTo: string;
  rackShadow: ViewStyle;
  compactSurface: string;
  compactBorder: string;
  compactShadow: ViewStyle;
  compactYearLabel: string;
  yearLabel: string;
  monthActive: string;
  monthNear: string;
  monthFar: string;
  activeRowFill: string;
  activeAccentBar: string;
  activityTrack: string;
  activityFill: string;
  mapRowHighlight: string;
  mapRowPressed: string;
};

export function temporalChromeColors(t: AppTheme): TemporalChromeColors {
  const { colors, isDark, sunlightMode } = t;
  return {
    rackSurface: isDark
      ? 'rgba(15, 16, 22, 0.92)'
      : sunlightMode
        ? colors.surfaceSearch
        : 'rgba(255, 255, 255, 0.94)',
    rackBorder: colors.searchBorder,
    rackBorderActive: colors.borderFocus,
    rackFadeTo: isDark ? 'rgba(10, 10, 14, 0)' : 'rgba(245, 245, 248, 0)',
    rackShadow:
      Platform.OS === 'ios'
        ? {
            shadowColor: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(40,48,80,0.2)',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: isDark ? 0.35 : 0.18,
            shadowRadius: 14,
          }
        : { elevation: isDark ? 8 : 4 },
    compactSurface: isDark ? 'rgba(24, 26, 38, 0.98)' : 'rgba(255, 255, 255, 0.98)',
    compactBorder: isDark ? 'rgba(150, 162, 224, 0.42)' : colors.borderFocus,
    compactShadow:
      Platform.OS === 'ios'
        ? {
            shadowColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(40,48,80,0.28)',
            shadowOffset: { width: -2, height: 4 },
            shadowOpacity: isDark ? 0.5 : 0.22,
            shadowRadius: 16,
          }
        : { elevation: isDark ? 10 : 6 },
    compactYearLabel: isDark ? 'rgba(200, 206, 230, 0.88)' : colors.metaFg,
    yearLabel: colors.sectionFg,
    monthActive: colors.accent,
    monthNear: colors.metaFg,
    monthFar: colors.muted,
    activeRowFill: colors.accentSubtle,
    activeAccentBar: colors.accent,
    activityTrack: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
    activityFill: isDark ? 'rgba(160, 170, 220, 0.42)' : 'rgba(100, 110, 180, 0.32)',
    mapRowHighlight: colors.accentSubtle,
    mapRowPressed: isDark ? 'rgba(128, 138, 188, 0.1)' : 'rgba(100, 110, 180, 0.07)',
  };
}
