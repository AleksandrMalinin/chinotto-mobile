import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';

import { captureInputPaddingTop, type AppTheme } from '../theme';

export type VoiceCaptureControlPhase = 'idle' | 'listening';

export type VoiceMicButtonProps = {
  phase: VoiceCaptureControlPhase;
  onPress: () => void;
  theme: AppTheme;
  /** `capture` = beside composer; `inline` = sheet toolbar / edit chrome. */
  placement?: 'capture' | 'inline';
};

/** Mic beside capture field; scale pulse while listening is the only listening affordance. */
export function VoiceMicButton({
  phase,
  onPress,
  theme: t,
  placement = 'capture',
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
  const micMarginTop =
    placement === 'inline'
      ? 0
      : captureInputPaddingTop +
        capture.lineHeight / 2 -
        MIC_OUTER / 2 +
        Platform.select({ ios: -2, default: -3 });

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
              size={20}
              color={listening ? t.colors.accent : t.sunlightMode ? t.colors.muted : t.colors.fgDim}
            />
          </View>
        </Animated.View>
      </LinearGradient>
    </Pressable>
  );
}

const MIC_OUTER = 42;
const MIC_INNER = 36;
const MIC_LISTENING_SCALE = 1.04;
const MIC_LISTENING_SHADOW_RADIUS = 10;

/** Room beside capture for listening glow (iOS shadow extends outside layout bounds). */
export const VOICE_MIC_CLUSTER_OVERFLOW_PAD_HORIZONTAL = Math.ceil(MIC_LISTENING_SHADOW_RADIUS * 0.85);

export const VOICE_MIC_CLUSTER_WIDTH =
  MIC_OUTER + 2 * VOICE_MIC_CLUSTER_OVERFLOW_PAD_HORIZONTAL;

/** Pad the action cluster so mic ring alignment (negative marginTop) isn't clipped by overflow:hidden. */
export const VOICE_MIC_CLUSTER_OVERFLOW_PAD_TOP = Math.max(
  0,
  -(
    captureInputPaddingTop +
    26 / 2 -
    MIC_OUTER / 2 +
    (Platform.OS === 'ios' ? -2 : -3)
  ),
);

const styles = StyleSheet.create({
  micGradientRing: {
    width: MIC_OUTER,
    height: MIC_OUTER,
    borderRadius: MIC_OUTER / 2,
    padding: 3,
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
