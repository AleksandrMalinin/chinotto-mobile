import type { Animated } from 'react-native';

/**
 * Plum wash leads content — register shifts before thoughts appear.
 * scrollX: 0 = Echo, pageWidth = stream home.
 */
export function echoWashPresence(
  scrollX: Animated.Value,
  pageWidth: number,
): Animated.AnimatedInterpolation<number> {
  return scrollX.interpolate({
    inputRange: [0, pageWidth * 0.35, pageWidth * 0.65, pageWidth],
    outputRange: [1, 0.88, 0.42, 0],
    extrapolate: 'clamp',
  });
}

/** Content lags wash — visible once Echo is meaningfully on screen. */
export function echoContentOpacity(
  scrollX: Animated.Value,
  pageWidth: number,
): Animated.AnimatedInterpolation<number> {
  return scrollX.interpolate({
    inputRange: [0, pageWidth * 0.45, pageWidth * 0.72, pageWidth],
    outputRange: [1, 0.22, 0, 0],
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
