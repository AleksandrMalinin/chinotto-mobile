import type { Animated } from 'react-native';

/** Opacity follows reveal — visible once Echo is meaningfully on screen. */
export function echoContentOpacity(
  scrollX: Animated.Value,
  pageWidth: number,
): Animated.AnimatedInterpolation<number> {
  return scrollX.interpolate({
    inputRange: [0, pageWidth * 0.25, pageWidth * 0.55, pageWidth],
    outputRange: [1, 0.35, 0, 0],
    extrapolate: 'clamp',
  });
}

/** Subtle parallax on threshold content while swiping (0–2.5px). */
export function echoContentParallaxX(
  scrollX: Animated.Value,
  pageWidth: number,
): Animated.AnimatedInterpolation<number> {
  return scrollX.interpolate({
    inputRange: [0, pageWidth],
    outputRange: [0, 2.5],
    extrapolate: 'clamp',
  });
}
