import { useEffect, useRef } from 'react';
import {
  Animated,
  type StyleProp,
  type ViewStyle,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { fonts, useAppTheme } from '../theme';

/** Matches Firebase auth restore + link state for the header control. */
export type SyncHeaderAuthPhase = 'restoring' | 'signed_in' | 'signed_out';

export type SyncHeaderStatusProps = {
  phase: SyncHeaderAuthPhase;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

const DOT_SIZE = 7;
/** Tight gap between dot and label — reads as one unit. */
const DOT_LABEL_GAP = 8;

/** Lavender from the shell palette; deliberately not a “success” green. */
const SYNC_DOT_FILL = 'rgba(148, 156, 212, 0.58)';
const SYNC_DOT_SHADOW_IOS = 'rgba(165, 172, 225, 0.55)';

function syncDotShadowStyle(): ViewStyle {
  if (Platform.OS !== 'ios') {
    return {};
  }
  return {
    shadowColor: SYNC_DOT_SHADOW_IOS,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.42,
    shadowRadius: 5,
  };
}

export function SyncHeaderStatus({ phase, onPress, style }: SyncHeaderStatusProps) {
  const t = useAppTheme();
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    if (phase !== 'restoring') {
      pulse.stopAnimation();
      pulse.setValue(1);
      return;
    }

    pulse.setValue(0.42);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.88,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.36,
          duration: 1100,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [phase, pulse]);

  const label =
    phase === 'restoring' ? 'Checking sync' : phase === 'signed_in' ? 'Synced' : 'Enable sync';

  /** Disconnected: text is the signal; slightly stronger than stream chrome (`muted`). */
  const textColor = phase === 'signed_out' ? t.colors.fgDim : t.colors.muted;

  const showDot = phase === 'restoring' || phase === 'signed_in';

  const accessibilityLabel =
    phase === 'signed_in'
      ? 'Synced'
      : phase === 'restoring'
        ? 'Checking sync'
        : 'Enable sync with Apple';

  return (
    <Pressable
      testID="sync-header-cta"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => [style, { opacity: pressed ? 0.65 : 1 }]}
    >
      <View style={styles.row}>
        {showDot ? (
          phase === 'restoring' ? (
            <Animated.View
              testID="sync-header-dot"
              importantForAccessibility="no"
              style={[
                styles.dot,
                {
                  backgroundColor: SYNC_DOT_FILL,
                  opacity: pulse,
                  ...syncDotShadowStyle(),
                },
              ]}
            />
          ) : (
            <View
              testID="sync-header-dot"
              importantForAccessibility="no"
              style={[
                styles.dot,
                {
                  backgroundColor: SYNC_DOT_FILL,
                  opacity: 0.88,
                  ...syncDotShadowStyle(),
                },
              ]}
            />
          )
        ) : null}
        <Text style={[styles.label, { color: textColor, fontFamily: fonts.medium }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    marginRight: DOT_LABEL_GAP,
  },
  label: {
    fontSize: 15,
    letterSpacing: 0.2,
  },
});
