import { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAppTheme } from '../theme';

/** ~20s full cycle — soft “ambient-glow” breathing (desktop ~20s). */
const PULSE_MS = 20000;

/**
 * Cosmic shell: charcoal base + **full-bleed** violet/blue washes (no elliptical clips —
 * those read as two sharp “circles” on device). Top atmosphere + bottom vignette unify edges.
 */
export function AmbientBackground() {
  const t = useAppTheme();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | undefined;
    let cancelled = false;

    const run = (reduceMotion: boolean) => {
      if (cancelled || reduceMotion) return;
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 0.82,
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
  }, [pulse]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: t.colors.bg }]} />

      {/* Cool-violet wash — upper-left → center; no circular mask = no hard ring */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: pulse }]}>
        <LinearGradient
          colors={[
            'rgba(100, 118, 185, 0.125)',
            'rgba(100, 118, 185, 0.038)',
            'rgba(100, 118, 185, 0.008)',
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
            'rgba(75, 98, 155, 0.03)',
            'rgba(75, 98, 155, 0.098)',
            'rgba(75, 98, 155, 0.038)',
          ]}
          locations={[0, 0.38, 0.72, 1]}
          start={{ x: 1, y: 0.95 }}
          end={{ x: 0.08, y: 0.12 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Top-center wash — pulled deeper so the lighter band reaches the capture composer (below header). */}
      <LinearGradient
        colors={['rgba(58, 70, 105, 0.118)', 'rgba(58, 70, 105, 0.028)', 'transparent']}
        locations={[0, 0.32, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.64 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <LinearGradient
        colors={['transparent', 'rgba(5, 6, 11, 0.52)', 'rgba(5, 6, 11, 0.945)']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
    </View>
  );
}
