import { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAppTheme } from '../theme';

/** ~20s full cycle — soft “ambient-glow” breathing (desktop ~20s). */
const PULSE_MS = 20000;

/**
 * Cosmic shell: charcoal base + two violet/blue glows + top atmosphere.
 * (No full-screen BlurView on top — iOS dark blur stacks over these reads as flat black.)
 * `pointerEvents="none"` everywhere so capture stays instant.
 */
export function AmbientBackground() {
  const t = useAppTheme();
  const { width, height } = useWindowDimensions();
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

  const orb = Math.max(width, height) * 0.85;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: t.colors.bg }]} />

      <Animated.View style={[styles.orbWrap, { opacity: pulse, left: -width * 0.15, top: -height * 0.08 }]}>
        <LinearGradient
          colors={['rgba(120, 140, 210, 0.42)', 'transparent']}
          start={{ x: 0.2, y: 0.1 }}
          end={{ x: 0.9, y: 0.9 }}
          style={{ width: orb, height: orb * 0.75, borderRadius: orb }}
        />
      </Animated.View>

      <Animated.View style={[styles.orbWrap, { opacity: pulse, right: -width * 0.12, bottom: -height * 0.1 }]}>
        <LinearGradient
          colors={['rgba(90, 115, 175, 0.36)', 'transparent']}
          start={{ x: 0.9, y: 0.85 }}
          end={{ x: 0.1, y: 0.15 }}
          style={{ width: orb * 0.9, height: orb * 0.7, borderRadius: orb }}
        />
      </Animated.View>

      <LinearGradient
        colors={[t.colors.atmosphereSoft, 'transparent', 'transparent']}
        locations={[0, 0.38, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.55 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <LinearGradient
        colors={['transparent', 'transparent', 'rgba(8,10,18,0.85)']}
        locations={[0, 0.55, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  orbWrap: {
    position: 'absolute',
  },
});
