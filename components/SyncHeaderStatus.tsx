import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  type StyleProp,
  type TextStyle,
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
  /** When signed in: true if upload queue still has pending rows. */
  uploadPending?: boolean;
  /** When signed in: large pending queue for several polls (offline or repeated upload errors). */
  uploadStuck?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  /**
   * One-shot soft highlight over “Enable sync” (signed_out only). Parent turns off after
   * {@link onEnableSyncLabelShimmerComplete}.
   */
  enableSyncLabelShimmer?: boolean;
  onEnableSyncLabelShimmerComplete?: () => void;
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

type EnableSyncLabelWithShimmerProps = {
  text: string;
  textStyle: StyleProp<TextStyle>;
  isDark: boolean;
  onComplete?: () => void;
};

/** Single left→right sweep; low contrast; no loop (`useNativeDriver: false` for reliable layout clip). */
function EnableSyncLabelWithShimmer({ text, textStyle, isDark, onComplete }: EnableSyncLabelWithShimmerProps) {
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    sweep.setValue(0);
    const anim = Animated.timing(sweep, {
      toValue: 1,
      duration: 1280,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    });
    anim.start(({ finished }) => {
      if (finished && !cancelled) {
        onComplete?.();
      }
    });
    return () => {
      cancelled = true;
      anim.stop();
    };
  }, [onComplete, sweep]);

  const translateX = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [-36, 108],
  });

  const colors = isDark
    ? (['transparent', 'rgba(255,255,255,0.11)', 'transparent'] as const)
    : (['transparent', 'rgba(0,0,0,0.07)', 'transparent'] as const);

  return (
    <View style={styles.labelShimmerHost} testID="enable-sync-label-shimmer">
      <Text style={textStyle}>{text}</Text>
      <Animated.View
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no"
        style={[StyleSheet.absoluteFillObject, styles.labelShimmerClip, { opacity: 0.18 }]}
      >
        <Animated.View style={{ height: '100%', transform: [{ translateX }] }}>
          <LinearGradient
            colors={[...colors]}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.labelShimmerBand}
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

export function SyncHeaderStatus({
  phase,
  uploadPending = false,
  uploadStuck = false,
  onPress,
  style,
  enableSyncLabelShimmer = false,
  onEnableSyncLabelShimmerComplete,
}: SyncHeaderStatusProps) {
  const t = useAppTheme();
  const pulse = useRef(new Animated.Value(0.45)).current;

  const pulseForActivity =
    phase === 'restoring' || (phase === 'signed_in' && uploadPending && !uploadStuck);

  useEffect(() => {
    if (!pulseForActivity) {
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
  }, [pulseForActivity, pulse]);

  const label =
    phase === 'restoring'
      ? 'Checking sync'
      : phase === 'signed_in'
        ? uploadStuck
          ? 'Sync paused'
          : uploadPending
            ? 'Syncing…'
            : 'Synced'
        : 'Enable sync';

  /** Intentionally quiet — sync is optional; never compete with capture. */
  const textColor =
    phase === 'signed_out'
      ? t.colors.sectionFg
      : phase === 'signed_in'
        ? uploadStuck
          ? t.colors.sectionFg
          : t.colors.muted
        : t.colors.muted;

  const showDot = phase === 'restoring' || phase === 'signed_in';

  const accessibilityLabel =
    phase === 'signed_in'
      ? uploadStuck
        ? 'Sync paused, open for details'
        : uploadPending
          ? 'Syncing to cloud'
          : 'Synced'
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
      style={({ pressed }) => [style, { opacity: pressed ? 0.55 : 0.88 }]}
    >
      <View style={styles.row}>
        {showDot ? (
          pulseForActivity ? (
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
                  opacity: 0.52,
                  ...syncDotShadowStyle(),
                },
              ]}
            />
          )
        ) : null}
        {phase === 'signed_out' && enableSyncLabelShimmer ? (
          <EnableSyncLabelWithShimmer
            text={label}
            textStyle={[styles.label, { color: textColor, fontFamily: fonts.regular }]}
            isDark={t.isDark}
            onComplete={onEnableSyncLabelShimmerComplete}
          />
        ) : (
          <Text style={[styles.label, { color: textColor, fontFamily: fonts.regular }]}>{label}</Text>
        )}
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
    fontSize: 13,
    letterSpacing: 0.18,
  },
  labelShimmerHost: {
    alignSelf: 'flex-start',
    position: 'relative',
  },
  labelShimmerClip: {
    overflow: 'hidden',
  },
  labelShimmerBand: {
    width: 44,
    height: '100%',
  },
});
