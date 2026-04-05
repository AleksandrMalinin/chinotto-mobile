import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, radius, type AppTheme } from '../theme';

export type VoiceCaptureControlPhase = 'idle' | 'listening';

export type VoiceCaptureControlProps = {
  phase: VoiceCaptureControlPhase;
  onPress: () => void;
  theme: AppTheme;
};

/** Minimal capture chrome: soft gradient ring + calm pulse while listening (no dictation UI). */
export function VoiceCaptureControl({ phase, onPress, theme: t }: VoiceCaptureControlProps) {
  const listening = phase === 'listening';
  const micScale = useRef(new Animated.Value(1)).current;
  const dotOpacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    if (!listening) {
      micScale.setValue(1);
      dotOpacity.setValue(0.45);
      return;
    }

    const breathe = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(micScale, {
            toValue: 1.04,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(dotOpacity, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(micScale, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(dotOpacity, {
            toValue: 0.35,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    breathe.start();
    return () => breathe.stop();
  }, [listening, micScale, dotOpacity]);

  const accentRgb = t.isDark ? '160, 170, 255' : '90, 100, 200';

  return (
    <View style={styles.row}>
      <View style={styles.rowFill}>
        {listening ? (
          <View
            style={[
              styles.listeningPill,
              {
                backgroundColor: t.colors.accentSubtle,
                borderColor: t.colors.border,
              },
            ]}
            accessibilityLiveRegion="polite"
          >
            <Animated.View
              style={[
                styles.listeningDot,
                {
                  backgroundColor: t.colors.accent,
                  opacity: dotOpacity,
                },
              ]}
            />
            <Text
              style={[
                styles.listeningLabel,
                { color: t.colors.metaFg, fontFamily: fonts.regular },
              ]}
            >
              Listening…
            </Text>
          </View>
        ) : null}
      </View>

      <Pressable
        accessibilityLabel={listening ? 'Stop listening' : 'Speak thought'}
        accessibilityRole="button"
        hitSlop={12}
        onPress={onPress}
        style={({ pressed }) => [pressed ? styles.micPressed : null]}
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
                size={21}
                color={listening ? t.colors.accent : t.colors.fgDim}
              />
            </View>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const MIC_OUTER = 46;
const MIC_INNER = 40;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    minHeight: 40,
  },
  rowFill: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  listeningPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingLeft: 10,
    paddingRight: 12,
    paddingVertical: 7,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  listeningDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 8,
  },
  listeningLabel: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
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
