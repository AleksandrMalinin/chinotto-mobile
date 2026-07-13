import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';

import type { AppTheme } from '../theme';
import {
  captureMicMarginTop,
  MIC_LISTENING_SHADOW_RADIUS,
  MIC_OUTER,
} from './voiceCaptureAlignment';

export type VoiceCaptureControlPhase = 'idle' | 'listening';

export type VoiceMicButtonProps = {
  phase: VoiceCaptureControlPhase;
  onPress: () => void;
  theme: AppTheme;
  /** `capture` = beside composer; `inline` = sheet toolbar / edit chrome. */
  placement?: 'capture' | 'inline';
  /** Match active capture line height (hero when empty, capture when typing). */
  captureLineHeight?: number;
};

const MIC_INNER = 30;
const MIC_ICON_SIZE = 17;
const MIC_LISTENING_SCALE = 1.04;

/** Mic beside capture field; scale pulse while listening is the only listening affordance. */
export function VoiceMicButton({
  phase,
  onPress,
  theme: t,
  placement = 'capture',
  captureLineHeight,
}: VoiceMicButtonProps) {
  const listening = phase === 'listening';
  const micScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!listening) {
      micScale.setValue(1);
      return;
    }
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(micScale, {
          toValue: MIC_LISTENING_SCALE,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(micScale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    breathe.start();
    return () => breathe.stop();
  }, [listening, micScale]);

  const accentRgb = '160, 170, 255';
  const ringHigh = listening
    ? t.sunlightMode
      ? 0.46
      : 0.42
    : t.sunlightMode
      ? 0.34
      : 0.2;
  const ringLow = listening
    ? t.sunlightMode
      ? 0.4
      : 0.14
    : t.sunlightMode
      ? 0.26
      : 0.06;
  const { capture } = t.typography;
  const activeCaptureLineHeight = captureLineHeight ?? capture.lineHeight;
  const micMarginTop =
    placement === 'inline' ? 0 : captureMicMarginTop(activeCaptureLineHeight);

  return (
    <Pressable
      accessibilityLabel={listening ? 'Stop listening' : 'Speak thought'}
      accessibilityHint={
        listening
          ? 'Tap when you are done speaking'
          : 'Starts listening until you tap again; speak at your own pace'
      }
      accessibilityRole="button"
      accessibilityState={{ busy: listening }}
      hitSlop={12}
      onPress={onPress}
      style={({ pressed }) => [{ marginTop: micMarginTop }, pressed ? styles.micPressed : null]}
    >
      <LinearGradient
        colors={[`rgba(${accentRgb}, ${ringHigh})`, `rgba(${accentRgb}, ${ringLow})`]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.micGradientRing}
      >
        <Animated.View style={{ transform: [{ scale: micScale }] }}>
          <View
            style={[
              styles.micInner,
              {
                backgroundColor: t.colors.bgElevated,
                ...(t.sunlightMode
                  ? {
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: 'rgba(255,255,255,0.34)',
                    }
                  : null),
                ...Platform.select({
                  ios: {
                    shadowColor: t.sunlightMode ? 'rgba(100, 110, 170, 0.5)' : `rgb(${accentRgb})`,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: t.sunlightMode ? (listening ? 0.18 : 0.12) : listening ? 0.22 : 0.08,
                    shadowRadius: t.sunlightMode ? (listening ? 6 : 4) : listening ? MIC_LISTENING_SHADOW_RADIUS : 4,
                  },
                  android: {
                    elevation: t.sunlightMode ? (listening ? 2 : 1) : listening ? 3 : 1,
                  },
                }),
              },
            ]}
          >
            <Ionicons
              name={listening ? 'mic' : 'mic-outline'}
              size={MIC_ICON_SIZE}
              color={listening ? t.colors.accent : t.sunlightMode ? t.colors.muted : t.colors.fgDim}
            />
          </View>
        </Animated.View>
      </LinearGradient>
    </Pressable>
  );
}

export {
  MIC_LISTENING_SHADOW_RADIUS,
  VOICE_MIC_CLUSTER_OVERFLOW_PAD_HORIZONTAL,
  VOICE_MIC_CLUSTER_OVERFLOW_PAD_TOP,
  VOICE_MIC_CLUSTER_WIDTH,
  voiceMicClusterOverflowPadTop,
} from './voiceCaptureAlignment';

const styles = StyleSheet.create({
  micGradientRing: {
    width: MIC_OUTER,
    height: MIC_OUTER,
    borderRadius: MIC_OUTER / 2,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micInner: {
    width: MIC_INNER,
    height: MIC_INNER,
    borderRadius: MIC_INNER / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micPressed: {
    opacity: 0.88,
  },
});
