import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
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

import { chinottoHeadlineTextGradient, fonts, type AppTheme, useAppTheme } from '../theme';

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

/**
 * Classic dark (not sunlight): cooler, softer than the previous 0.94 “chrome white” — still above sectionFg.
 * (Do not wrap signed_out in extra View opacity — it multiplies and kills contrast.)
 */
const ENABLE_SYNC_LABEL_DARK = 'rgba(180, 188, 208, 0.58)';
/** Brighter than standard dark — matches high-legibility Sunlight shell (`fg` reads near-white). */
const ENABLE_SYNC_LABEL_SUNLIGHT = 'rgba(255,255,255,0.9)';
const ENABLE_SYNC_LABEL_LIGHT = 'rgba(0,0,0,0.32)';

/** Rest opacity: was 0.88 — small lift so the control reads as UI, not background. */
const CTA_REST_OPACITY = 0.92;
const CTA_PRESSED_OPACITY = 0.62;

/** Same gradient as empty-stream headline; extra-dim so the header CTA whispers (standard dark). */
const ENABLE_SYNC_HEADLINE_GRADIENT_OPACITY = 0.58;
/** Sunlight: lift gradient shell so the CTA does not read as muted as standard mode. */
const ENABLE_SYNC_HEADLINE_GRADIENT_OPACITY_SUNLIGHT = 0.84;

/** Lavender from the shell palette; deliberately not a “success” green. */
const SYNC_DOT_FILL = 'rgba(148, 156, 212, 0.58)';
const SYNC_DOT_FILL_SUNLIGHT = 'rgba(210, 216, 255, 0.92)';
const SYNC_DOT_SHADOW_IOS = 'rgba(165, 172, 225, 0.55)';

function syncDotFill(sunlightMode: boolean): string {
  return sunlightMode ? SYNC_DOT_FILL_SUNLIGHT : SYNC_DOT_FILL;
}

function syncDotShadowStyle(sunlightMode: boolean): ViewStyle {
  if (sunlightMode || Platform.OS !== 'ios') {
    return {};
  }
  return {
    shadowColor: SYNC_DOT_SHADOW_IOS,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.42,
    shadowRadius: 5,
  };
}

function enableSyncLabelColor(t: AppTheme): string {
  if (!t.isDark) {
    return ENABLE_SYNC_LABEL_LIGHT;
  }
  return t.sunlightMode ? ENABLE_SYNC_LABEL_SUNLIGHT : ENABLE_SYNC_LABEL_DARK;
}

/**
 * Headline text gradient (`chinottoHeadlineTextGradient`) clipped to glyphs — mirrors desktop empty title / “Write it down.”
 */
function EnableSyncHeadlineGradientLabel({
  text,
  flatColor,
  isDark,
  sunlightMode,
}: {
  text: string;
  flatColor: string;
  isDark: boolean;
  sunlightMode: boolean;
}) {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  const maskTextStyle = useMemo(
    () => [styles.label, { fontFamily: fonts.regular, color: '#000000' }],
    []
  );

  const g = chinottoHeadlineTextGradient;

  if (!isDark) {
    return (
      <Text
        testID="enable-sync-headline-gradient-label"
        style={[styles.label, { fontFamily: fonts.regular, color: flatColor }]}
      >
        {text}
      </Text>
    );
  }
  if (reduceMotion) {
    return (
      <Text
        testID="enable-sync-headline-gradient-label"
        style={[styles.label, { fontFamily: fonts.regular, color: flatColor }]}
      >
        {text}
      </Text>
    );
  }

  const gradientShellOpacity = sunlightMode
    ? ENABLE_SYNC_HEADLINE_GRADIENT_OPACITY_SUNLIGHT
    : ENABLE_SYNC_HEADLINE_GRADIENT_OPACITY;

  return (
    <View
      testID="enable-sync-headline-gradient-label"
      style={[styles.enableSyncGradientWrap, { opacity: gradientShellOpacity }]}
    >
      <MaskedView style={styles.maskedShimmerRoot} maskElement={<Text style={maskTextStyle}>{text}</Text>}>
        <LinearGradient colors={[...g.colors]} locations={[...g.locations]} start={g.start} end={g.end}>
          <Text style={[maskTextStyle, { opacity: 0 }]}>{text}</Text>
        </LinearGradient>
      </MaskedView>
    </View>
  );
}

type EnableSyncLabelWithShimmerProps = {
  text: string;
  textStyle: StyleProp<TextStyle>;
  isDark: boolean;
  sunlightMode: boolean;
  onComplete?: () => void;
};

/**
 * Single left→right sweep over the label; low contrast; no loop.
 * MaskedView clips the sweep to glyph shapes (not the line box).
 */
function EnableSyncLabelWithShimmer({
  text,
  textStyle,
  isDark,
  sunlightMode,
  onComplete,
}: EnableSyncLabelWithShimmerProps) {
  const sweep = useRef(new Animated.Value(0)).current;
  const flatText = StyleSheet.flatten(textStyle) as TextStyle;
  const baseColor = typeof flatText.color === 'string' ? flatText.color : '#000000';

  useEffect(() => {
    let cancelled = false;
    sweep.setValue(0);
    const anim = Animated.timing(sweep, {
      toValue: 1,
      duration: 2700,
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
    ? (['transparent', 'rgba(255,255,255,0.28)', 'transparent'] as const)
    : (['transparent', 'rgba(0,0,0,0.2)', 'transparent'] as const);

  const overlayOpacity = sunlightMode ? 0.22 : 0.38;

  return (
    <MaskedView
      testID="enable-sync-label-shimmer"
      style={styles.maskedShimmerRoot}
      maskElement={<Text style={[textStyle, { color: '#000000' }]}>{text}</Text>}
    >
      <View style={styles.shimmerMaskContent}>
        <Text style={[textStyle, { opacity: 0 }]}>{text}</Text>
        <View style={styles.shimmerLayers} pointerEvents="none" accessible={false} importantForAccessibility="no">
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: baseColor }]} />
          <Animated.View
            style={[
              styles.shimmerBandWrap,
              { opacity: overlayOpacity, transform: [{ translateX }] },
            ]}
          >
            <LinearGradient
              colors={[...colors]}
              locations={[0, 0.5, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.labelShimmerBand}
            />
          </Animated.View>
        </View>
      </View>
    </MaskedView>
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
            : 'Sync on'
        : 'Enable sync';

  /** Intentionally quiet — sync is optional; never compete with capture. signed_out uses tuned neutrals. */
  const textColor =
    phase === 'signed_out'
      ? enableSyncLabelColor(t)
      : phase === 'signed_in'
        ? uploadStuck
          ? t.colors.sectionFg
          : t.colors.muted
        : t.colors.muted;

  const showDot = phase === 'restoring' || phase === 'signed_in';

  const labelBaseStyle: StyleProp<TextStyle> = [styles.label, { color: textColor, fontFamily: fonts.regular }];

  const accessibilityLabel =
    phase === 'signed_in'
      ? uploadStuck
        ? 'Sync paused, open for details'
        : uploadPending
          ? 'Syncing to cloud'
          : 'Cloud sync on'
      : phase === 'restoring'
        ? 'Checking sync'
        : 'Enable sync with Apple';

  const row = (
    <View style={styles.row}>
      {showDot ? (
        pulseForActivity ? (
          <Animated.View
            testID="sync-header-dot"
            importantForAccessibility="no"
            style={[
              styles.dot,
              {
                backgroundColor: syncDotFill(t.sunlightMode),
                opacity: pulse,
                ...syncDotShadowStyle(t.sunlightMode),
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
                backgroundColor: syncDotFill(t.sunlightMode),
                opacity: 0.52,
                ...syncDotShadowStyle(t.sunlightMode),
              },
            ]}
          />
        )
      ) : null}
      {phase === 'signed_out' && enableSyncLabelShimmer ? (
        <EnableSyncLabelWithShimmer
          text={label}
          textStyle={labelBaseStyle}
          isDark={t.isDark}
          sunlightMode={t.sunlightMode}
          onComplete={onEnableSyncLabelShimmerComplete}
        />
      ) : phase === 'signed_out' ? (
        <EnableSyncHeadlineGradientLabel
          text={label}
          flatColor={enableSyncLabelColor(t)}
          isDark={t.isDark}
          sunlightMode={t.sunlightMode}
        />
      ) : (
        <Text style={labelBaseStyle}>{label}</Text>
      )}
    </View>
  );

  if (phase === 'signed_out') {
    return (
      <View style={style}>
        <Pressable
          testID="sync-header-cta"
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          hitSlop={10}
          onPress={onPress}
          style={({ pressed }) => ({ opacity: pressed ? CTA_PRESSED_OPACITY : 1 })}
        >
          {row}
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      testID="sync-header-cta"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => [style, { opacity: pressed ? CTA_PRESSED_OPACITY : CTA_REST_OPACITY }]}
    >
      {row}
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
  enableSyncGradientWrap: {
    alignSelf: 'flex-start',
  },
  maskedShimmerRoot: {
    alignSelf: 'flex-start',
  },
  shimmerMaskContent: {
    position: 'relative',
  },
  shimmerLayers: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  shimmerBandWrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  labelShimmerBand: {
    width: 44,
    height: '100%',
  },
});
