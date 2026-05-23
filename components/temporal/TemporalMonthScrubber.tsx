import { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { fonts, radius, useAppTheme } from '../../theme';

const FADE_IN_MS = 220;
const FADE_OUT_MS = 280;
const FADE_EASING = Easing.out(Easing.cubic);

export type TemporalMonthScrubberProps = {
  label: string;
  visible: boolean;
  onPress: () => void;
  rightInset: number;
  bottomInset: number;
};

/**
 * Floating month compass while exploring the stream — pointer events only on the pill.
 */
export function TemporalMonthScrubber({
  label,
  visible,
  onPress,
  rightInset,
  bottomInset,
}: TemporalMonthScrubberProps) {
  const t = useAppTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then((rm) => {
      reduceMotionRef.current = rm;
    });
  }, []);

  useEffect(() => {
    const target = visible ? 0.88 : 0;
    if (reduceMotionRef.current) {
      opacity.setValue(target);
      return;
    }
    Animated.timing(opacity, {
      toValue: target,
      duration: visible ? FADE_IN_MS : FADE_OUT_MS,
      easing: FADE_EASING,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  const surface = t.sunlightMode
    ? 'rgba(255, 255, 255, 0.72)'
    : t.isDark
      ? 'rgba(28, 30, 40, 0.78)'
      : 'rgba(255, 255, 255, 0.82)';
  const borderColor = t.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { right: rightInset, bottom: bottomInset }]}
      testID="temporal-month-scrubber-host"
    >
      <Animated.View style={{ opacity }} pointerEvents={visible ? 'auto' : 'none'}>
        <Pressable
          testID="temporal-month-scrubber"
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityHint="Opens timeline of months"
          hitSlop={8}
          onPress={onPress}
          style={({ pressed }) => [
            styles.pill,
            {
              backgroundColor: surface,
              borderColor,
              opacity: pressed ? 0.94 : 1,
            },
          ]}
        >
          <Text
            style={{
              fontFamily: fonts.regular,
              fontSize: t.typography.meta.fontSize,
              letterSpacing: 0.2,
              color: t.colors.metaFg,
            }}
            numberOfLines={1}
          >
            {label}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    zIndex: 3,
    maxWidth: 148,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.lg,
    borderWidth: Platform.OS === 'ios' ? StyleSheet.hairlineWidth : 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
