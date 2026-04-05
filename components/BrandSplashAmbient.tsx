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

/** Same pulse cadence as `AmbientBackground`. */
const PULSE_MS = 20000;

/**
 * Splash shell: same gradient stack + smooth transitions as before; values tuned **darker**
 * globally (muted neon + slightly heavier vignette).
 */
export function BrandSplashAmbient() {
  const t = useAppTheme();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (t.sunlightMode) {
      return;
    }
    let animation: Animated.CompositeAnimation | undefined;
    let cancelled = false;

    const run = (reduceMotion: boolean) => {
      if (cancelled || reduceMotion) return;
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 0.74,
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
  }, [pulse, t.sunlightMode]);

  if (t.sunlightMode) {
    return (
      <View testID="brand-splash-ambient" style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[StyleSheet.absoluteFill, { backgroundColor: t.colors.bg }]} />
        <LinearGradient
          colors={['rgba(100, 112, 160, 0.028)', 'transparent', 'rgba(78, 92, 138, 0.02)']}
          locations={[0, 0.48, 1]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
    );
  }

  return (
    <View testID="brand-splash-ambient" style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: t.colors.bg }]} />

      <View style={styles.gradientFlip} pointerEvents="none">
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: pulse }]}>
          <LinearGradient
            colors={[
              'rgba(168, 92, 255, 0.14)',
              'rgba(145, 82, 228, 0.055)',
              'rgba(115, 75, 210, 0.026)',
              'rgba(88, 65, 188, 0.012)',
              'rgba(72, 58, 165, 0.008)',
              'transparent',
            ]}
            locations={[0, 0.22, 0.44, 0.64, 0.82, 1]}
            start={{ x: 0.08, y: 0.06 }}
            end={{ x: 0.9, y: 0.98 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <Animated.View style={[StyleSheet.absoluteFill, { opacity: pulse }]}>
          <LinearGradient
            colors={[
              'rgba(78, 92, 255, 0.03)',
              'rgba(82, 98, 245, 0.014)',
              'rgba(90, 105, 250, 0.038)',
              'rgba(85, 100, 240, 0.024)',
              'rgba(72, 88, 220, 0.012)',
            ]}
            locations={[0, 0.32, 0.52, 0.72, 1]}
            start={{ x: 0.92, y: 0.08 }}
            end={{ x: 0.1, y: 0.95 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <LinearGradient
          colors={[
            'rgba(48, 52, 98, 0.028)',
            'rgba(44, 48, 88, 0.018)',
            'rgba(40, 44, 78, 0.011)',
            'rgba(38, 40, 70, 0.007)',
            'rgba(36, 38, 62, 0.004)',
          ]}
          locations={[0, 0.25, 0.5, 0.75, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <LinearGradient
          colors={[
            'transparent',
            'rgba(5, 6, 11, 0.09)',
            'rgba(5, 6, 11, 0.2)',
            'rgba(5, 6, 11, 0.34)',
            'rgba(5, 6, 11, 0.5)',
            'rgba(4, 5, 10, 0.84)',
          ]}
          locations={[0, 0.38, 0.52, 0.66, 0.8, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      </View>

      {/* Not flipped: pulls physical bottom back down after `scaleY: -1` left it too bright. */}
      <LinearGradient
        colors={['transparent', 'rgba(5, 6, 12, 0.12)', 'rgba(4, 5, 10, 0.38)']}
        locations={[0, 0.58, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  /** Vertical mirror: former “top” atmosphere reads at bottom, vignette at top. */
  gradientFlip: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ scaleY: -1 }],
  },
});
