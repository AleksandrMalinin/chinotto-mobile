import { Platform, type ViewStyle } from 'react-native';

import type { useAppTheme } from '../../theme';

type AppTheme = ReturnType<typeof useAppTheme>;

export type StreamSearchChrome = {
  blurTint:
    | 'dark'
    | 'light'
    | 'systemUltraThinMaterialDark'
    | 'systemUltraThinMaterialLight'
    | 'systemThinMaterialDark';
  blurIntensity: number;
  veil: string;
  innerFill: string;
  borderGradientIdle: readonly [string, string, string];
  borderGradientActive: readonly [string, string, string];
  specularTop: string;
  glyphIdle: string;
  glyphActive: string;
  shadowIdle: ViewStyle;
  shadowActive: ViewStyle;
};

type IosLegibleInterior = {
  idleVeil: string;
  activeVeil: string;
  idleInner: string;
  activeInner: string;
  idleSpecular: string;
  activeSpecular: string;
};

/** Dark glass inside the glow — white type stays legible; outer rim/shadow unchanged. */
function iosLegibleSearchInterior(veilRgb: string, fillRgb: string): IosLegibleInterior {
  return {
    idleVeil: `rgba(${veilRgb}, 0.5)`,
    activeVeil: `rgba(${veilRgb}, 0.62)`,
    idleInner: `rgba(${fillRgb}, 0.36)`,
    activeInner: `rgba(${fillRgb}, 0.42)`,
    idleSpecular: 'rgba(255, 255, 255, 0.1)',
    activeSpecular: 'rgba(255, 255, 255, 0.14)',
  };
}

/** Stream search — floating glass capsule (iOS material + gradient rim). */
export function streamSearchChrome(t: AppTheme, active: boolean): StreamSearchChrome {
  const { colors, isDark, sunlightMode } = t;

  const blurTint =
    Platform.OS === 'ios'
      ? 'systemUltraThinMaterialDark'
      : isDark
        ? 'dark'
        : 'light';

  const accent = colors.accent;
  const borderFocus = colors.borderFocus;

  const iosInterior = isDark
    ? sunlightMode
      ? iosLegibleSearchInterior('19, 18, 28', '29, 33, 48')
      : iosLegibleSearchInterior('10, 10, 14', '15, 15, 20')
    : null;

  const idleVeilIos = iosInterior?.idleVeil ?? 'rgba(100, 110, 170, 0.05)';
  const activeVeilIos = iosInterior?.activeVeil ?? 'rgba(80, 90, 140, 0.08)';

  const idleVeilAndroid = sunlightMode
    ? 'rgba(102, 118, 198, 0.1)'
    : isDark
      ? 'rgba(10, 10, 14, 0.52)'
      : 'rgba(255, 255, 255, 0.42)';
  const activeVeilAndroid = sunlightMode
    ? 'rgba(102, 118, 198, 0.16)'
    : isDark
      ? 'rgba(10, 10, 14, 0.64)'
      : 'rgba(255, 255, 255, 0.55)';

  const idleInnerAndroid = sunlightMode
    ? 'rgba(102, 118, 198, 0.08)'
    : isDark
      ? 'rgba(15, 15, 20, 0.36)'
      : 'rgba(252, 252, 254, 0.78)';
  const activeInnerAndroid = sunlightMode
    ? colors.surfaceSearch
    : isDark
      ? 'rgba(15, 15, 20, 0.42)'
      : 'rgba(252, 252, 254, 0.92)';

  return {
    blurTint,
    blurIntensity: Platform.OS === 'ios' ? (active ? 62 : 48) : active ? 48 : 36,
    veil: Platform.OS === 'ios' ? (active ? activeVeilIos : idleVeilIos) : active ? activeVeilAndroid : idleVeilAndroid,
    innerFill:
      Platform.OS === 'ios'
        ? iosInterior
          ? active
            ? iosInterior.activeInner
            : iosInterior.idleInner
          : 'transparent'
        : active
          ? activeInnerAndroid
          : idleInnerAndroid,
    borderGradientIdle: sunlightMode
      ? ['rgba(170, 188, 255, 0.28)', 'rgba(102, 118, 198, 0.1)', 'rgba(170, 188, 255, 0.16)']
      : isDark
        ? ['rgba(160, 170, 220, 0.16)', 'rgba(88, 104, 168, 0.07)', 'rgba(255, 255, 255, 0.05)']
        : ['rgba(100, 110, 170, 0.14)', 'rgba(80, 90, 140, 0.05)', 'rgba(0, 0, 0, 0.04)'],
    borderGradientActive: sunlightMode
      ? [accent, borderFocus, 'rgba(200, 210, 255, 0.5)']
      : [accent, borderFocus, 'rgba(100, 110, 170, 0.45)'],
    specularTop: iosInterior
      ? active
        ? iosInterior.activeSpecular
        : iosInterior.idleSpecular
      : active
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(200, 210, 255, 0.07)',
    glyphIdle: colors.muted,
    glyphActive: colors.metaFg,
    shadowIdle:
      Platform.OS === 'ios'
        ? {
            shadowColor: isDark ? 'rgba(70, 82, 130, 0.85)' : 'rgba(60, 70, 120, 0.35)',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: isDark ? 0.2 : 0.1,
            shadowRadius: 14,
          }
        : { elevation: 2 },
    shadowActive:
      Platform.OS === 'ios'
        ? {
            shadowColor: isDark ? 'rgba(120, 140, 220, 0.9)' : 'rgba(80, 100, 180, 0.55)',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.35,
            shadowRadius: 14,
          }
        : { elevation: 6 },
  };
}
