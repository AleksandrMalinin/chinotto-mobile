import { useEffect, useMemo, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { getTheme, useAppTheme } from '../theme';

/** ~20s full cycle — soft “ambient-glow” breathing (desktop ~20s). */
const PULSE_MS = 20000;

/**
 * Quiet charcoal shell — same `#0a0a0e` base as desktop, with subtle violet depth for mobile.
 * Washes stay full-bleed (no elliptical clips — those read as hard rings on device).
 * Middle ground: near-desktop flatness + just enough lift so the handheld viewport is not a flat void.
 *
 * {@link AppTheme.blendProgress} crossfades toward the near-flat sunlight wash with adaptive brightness.
 *
 * `fixedChrome`: always use standard dark shell (one-shot surfaces must not follow sunlight blend).
 */
export function AmbientBackground({ fixedChrome = false }: { fixedChrome?: boolean }) {
  const adaptiveTheme = useAppTheme();
  const standardTheme = useMemo(() => getTheme(), []);
  const t = fixedChrome ? standardTheme : adaptiveTheme;
  const pulse = useRef(new Animated.Value(1)).current;
  const normalWeight = Math.max(0, 1 - t.blendProgress);
  const sunWeight = Math.max(0, t.blendProgress);
  const pulseActive = normalWeight > 0.001;

  useEffect(() => {
    if (!pulseActive) {
      return;
    }
    let animation: Animated.CompositeAnimation | undefined;
    let cancelled = false;

    const run = (reduceMotion: boolean) => {
      if (cancelled || reduceMotion) return;
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 0.9,
            duration: PULSE_MS / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: PULSE_MS / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    };

    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => run(reduce));

    return () => {
      cancelled = true;
      animation?.stop();
    };
  }, [pulse, pulseActive]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: t.colors.bg }]} />

      <View style={[StyleSheet.absoluteFill, { opacity: normalWeight }]} pointerEvents="none">
        {/* Cool-violet wash — upper-left → center */}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: pulse }]}>
          <LinearGradient
            colors={[
              'rgba(100, 118, 185, 0.075)',
              'rgba(100, 118, 185, 0.024)',
              'rgba(100, 118, 185, 0.006)',
              'transparent',
            ]}
            locations={[0, 0.38, 0.66, 1]}
            start={{ x: 0.06, y: 0 }}
            end={{ x: 0.9, y: 0.94 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Blue-violet wash — lower-right → interior */}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: pulse }]}>
          <LinearGradient
            colors={[
              'transparent',
              'rgba(75, 98, 155, 0.018)',
              'rgba(75, 98, 155, 0.055)',
              'rgba(75, 98, 155, 0.02)',
            ]}
            locations={[0, 0.38, 0.72, 1]}
            start={{ x: 1, y: 0.95 }}
            end={{ x: 0.08, y: 0.12 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Top wash — barely lifts composer; capped well below pre-parity mobile (0.118). */}
        <LinearGradient
          colors={['rgba(58, 70, 105, 0.03)', 'rgba(58, 70, 105, 0.008)', 'transparent']}
          locations={[0, 0.28, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.58 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      </View>

      {/* Near-flat sunlight wash — fades in with blendProgress */}
      <View style={[StyleSheet.absoluteFill, { opacity: sunWeight }]} pointerEvents="none">
        <LinearGradient
          colors={['rgba(92, 104, 152, 0.028)', 'transparent', 'rgba(72, 88, 132, 0.02)']}
          locations={[0, 0.52, 1]}
          start={{ x: 0.06, y: 0 }}
          end={{ x: 0.94, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
    </View>
  );
}
