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
};

/** Mic beside capture field; scale pulse while listening is the only listening affordance. */
export function VoiceMicButton({ phase, onPress, theme: t }: VoiceMicButtonProps) {
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
          toValue: 1.04,
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

  const accentRgb = t.isDark ? '160, 170, 255' : '90, 100, 200';
  const { capture } = t.typography;
  const micMarginTop =
    captureInputPaddingTop +
    capture.lineHeight / 2 -
    MIC_OUTER / 2 +
    Platform.select({ ios: -2, default: -3 });

  return (
    <Pressable
      accessibilityLabel={listening ? 'Stop listening' : 'Speak thought'}
      accessibilityHint={listening ? undefined : 'Starts listening; speak a short thought'}
      accessibilityRole="button"
      accessibilityState={{ busy: listening }}
      hitSlop={12}
      onPress={onPress}
      style={({ pressed }) => [{ marginTop: micMarginTop }, pressed ? styles.micPressed : null]}
    >
      <Animated.View style={{ transform: [{ scale: micScale }] }}>
        <LinearGradient
          colors={[
            `rgba(${accentRgb}, ${listening ? 0.42 : 0.2})`,
            `rgba(${accentRgb}, ${listening ? 0.14 : 0.06})`,
          ]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.micGradientRing}
        >
          <View
            style={[
              styles.micInner,
              {
                backgroundColor: t.colors.bgElevated,
                ...Platform.select({
                  ios: {
                    shadowColor: `rgb(${accentRgb})`,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: listening ? 0.22 : 0.08,
                    shadowRadius: listening ? 10 : 4,
                  },
                  android: {
                    elevation: listening ? 3 : 1,
                  },
                }),
              },
            ]}
          >
            <Ionicons
              name={listening ? 'mic' : 'mic-outline'}
              size={20}
              color={listening ? t.colors.accent : t.colors.fgDim}
            />
          </View>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const MIC_OUTER = 42;
const MIC_INNER = 36;

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
