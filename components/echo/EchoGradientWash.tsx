import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import type { EchoChromeColors } from './echoChrome';

/** Soft plum washes — sits above flat echo depth/veil, below content. */
export function EchoGradientWash({ chrome }: { chrome: EchoChromeColors }) {
  return (
    <>
      <LinearGradient
        testID="echo-gradient-wash"
        colors={[chrome.echoGradientTop, 'transparent', chrome.echoGradientBottom]}
        locations={[0, 0.38, 1]}
        start={{ x: 0.12, y: 0 }}
        end={{ x: 0.88, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', chrome.echoGradientBottom, chrome.echoGradientTop]}
        locations={[0, 0.62, 1]}
        start={{ x: 1, y: 0.92 }}
        end={{ x: 0.08, y: 0.1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
    </>
  );
}
