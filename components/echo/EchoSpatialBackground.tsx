import { Animated, StyleSheet } from 'react-native';

import { AmbientBackground } from '../AmbientBackground';
import { EchoGradientWash } from './EchoGradientWash';
import type { EchoChromeColors } from './echoChrome';

export type EchoSpatialBackgroundProps = {
  /** Horizontal pager offset — 0 on Echo, `pageWidth` = stream home. */
  scrollX: Animated.Value;
  pageWidth: number;
  echoMounted: boolean;
  chrome: EchoChromeColors;
  /** 0–1 proxy intensity — slightly deepens echo wash (no labels). */
  emotionalIntensity?: number;
};

/**
 * Stream blue-violet ambient eases back while a plum memory wash fades in —
 * two related Chinotto registers, visibly different mid-swipe.
 */
export function EchoSpatialBackground({
  scrollX,
  pageWidth,
  echoMounted,
  chrome,
  emotionalIntensity = 0,
}: EchoSpatialBackgroundProps) {
  if (!echoMounted || pageWidth <= 0) {
    return <AmbientBackground />;
  }

  const echoPresence = scrollX.interpolate({
    inputRange: [0, pageWidth],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const streamPresence = scrollX.interpolate({
    inputRange: [0, pageWidth],
    outputRange: [0.62, 1],
    extrapolate: 'clamp',
  });

  return (
    <>
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: streamPresence }]}
        pointerEvents="none"
        testID="echo-spatial-stream-bg"
      >
        <AmbientBackground />
      </Animated.View>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { opacity: echoPresence, backgroundColor: chrome.echoDepth },
        ]}
        pointerEvents="none"
      />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { opacity: echoPresence, backgroundColor: chrome.echoVeil },
        ]}
        pointerEvents="none"
        testID="echo-spatial-echo-bg"
      />
      {emotionalIntensity > 0.08 ? (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: Animated.multiply(echoPresence, emotionalIntensity * 0.14),
              backgroundColor: chrome.echoDepth,
            },
          ]}
          pointerEvents="none"
          testID="echo-spatial-emotional-veil"
        />
      ) : null}
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: echoPresence }]}
        pointerEvents="none"
      >
        <EchoGradientWash chrome={chrome} />
      </Animated.View>
    </>
  );
}
