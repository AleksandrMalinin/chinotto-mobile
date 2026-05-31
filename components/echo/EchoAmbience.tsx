import { StyleSheet, View } from 'react-native';

import { EchoGradientWash } from './EchoGradientWash';
import type { EchoChromeColors } from './echoChrome';

export type EchoAmbienceProps = {
  chrome: EchoChromeColors;
};

/** Plum memory stack — pairs with {@link EchoSpatialBackground} crossfade. */
export function EchoAmbience({ chrome }: EchoAmbienceProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" testID="echo-ambience">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: chrome.echoDepth }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: chrome.echoVeil }]} />
      <EchoGradientWash chrome={chrome} />
    </View>
  );
}
