import { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

/**
 * Soft drifting blobs — same palette / intent as `chinotto-app` `.intro-screen-blob-*`
 * (violet / cyan / orange), without CSS `filter: blur` (RN uses large soft circles).
 */
export function IntroBlobField() {
  const { width, height } = useWindowDimensions();
  const a1 = useRef(new Animated.Value(0)).current;
  const a2 = useRef(new Animated.Value(0)).current;
  const a3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    const loops: Animated.CompositeAnimation[] = [];

    const mk = (av: Animated.Value, dur: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(av, {
            toValue: 1,
            duration: dur,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(av, {
            toValue: 0,
            duration: dur,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled || reduceMotion) return;
      loops.push(mk(a1, 25000), mk(a2, 27500), mk(a3, 22500));
      loops.forEach((l) => l.start());
    });

    return () => {
      cancelled = true;
      loops.forEach((l) => l.stop());
    };
  }, [a1, a2, a3]);

  const vmax = Math.max(width, height);

  const tx1 = a1.interpolate({ inputRange: [0, 1], outputRange: [0, width * 0.08] });
  const ty1 = a1.interpolate({ inputRange: [0, 1], outputRange: [0, height * 0.05] });

  const tx2 = a2.interpolate({ inputRange: [0, 1], outputRange: [0, -width * 0.06] });
  const ty2 = a2.interpolate({ inputRange: [0, 1], outputRange: [0, height * 0.07] });

  const tx3 = a3.interpolate({ inputRange: [0, 1], outputRange: [0, -width * 0.05] });
  const ty3 = a3.interpolate({ inputRange: [0, 1], outputRange: [0, -height * 0.06] });

  const s1 = vmax * 0.55;
  const s2 = vmax * 0.5;
  const s3 = vmax * 0.48;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={[
          styles.blob,
          {
            width: s1,
            height: s1,
            borderRadius: s1 / 2,
            left: width * 0.1,
            top: height * 0.18,
            backgroundColor: 'rgba(124, 58, 237, 0.14)',
            transform: [{ translateX: tx1 }, { translateY: ty1 }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.blob,
          {
            width: s2,
            height: s2,
            borderRadius: s2 / 2,
            left: width * 0.5 - s2 / 2,
            top: height * 0.5 - s2 / 2,
            backgroundColor: 'rgba(6, 182, 212, 0.12)',
            transform: [{ translateX: tx2 }, { translateY: ty2 }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.blob,
          {
            width: s3,
            height: s3,
            borderRadius: s3 / 2,
            right: width * 0.12,
            top: height * 0.58,
            backgroundColor: 'rgba(249, 115, 22, 0.11)',
            transform: [{ translateX: tx3 }, { translateY: ty3 }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
  },
});
