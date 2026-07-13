import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { captureInputPaddingTop } from '../theme';
import { MIC_ALIGN_NUDGE } from './voiceCaptureAlignment';

type Props = {
  /** Active capture line height (hero and typed capture share the same line box). */
  captureLineHeight: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Mirrors capture `TextInput` first-line geometry — same top pad, mic centered on the
 * line box (`lineHeight`), with the same iOS optical nudge as legacy capture placement.
 */
export function CaptureMicRail({
  captureLineHeight,
  children,
  style,
  testID = 'capture-mic-rail',
}: Props) {
  return (
    <View style={[styles.rail, style]} testID={testID}>
      <View style={styles.pad}>
        <View style={[styles.slot, { height: captureLineHeight }]}>
          <View style={styles.nudge}>{children}</View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    overflow: 'visible',
  },
  pad: {
    paddingTop: captureInputPaddingTop,
  },
  slot: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  nudge: {
    transform: [{ translateY: MIC_ALIGN_NUDGE }],
  },
});
