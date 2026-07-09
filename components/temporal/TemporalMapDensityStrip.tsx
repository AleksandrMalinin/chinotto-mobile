import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { PinchGestureHandler, State } from 'react-native-gesture-handler';
import type { PinchGestureHandlerGestureEvent } from 'react-native-gesture-handler';

import type { MonthKey, MonthSummary } from '../../types/temporal';
import { useAppTheme } from '../../theme';
import { monthActivityRatio } from '../../utils/streamMonthIndex';
import { temporalChromeColors } from './temporalChrome';

const STRIP_MIN_H = 10;
const STRIP_MAX_H = 36;
const PINCH_SCALE_MIN = 1;
const PINCH_SCALE_MAX = 2.4;

export type TemporalMapDensityStripProps = {
  months: readonly MonthSummary[];
  activityMax: number;
  highlightedMonthKey: MonthKey | null;
  onSelectMonth: (monthKey: MonthKey) => void;
};

export function TemporalMapDensityStrip({
  months,
  activityMax,
  highlightedMonthKey,
  onSelectMonth,
}: TemporalMapDensityStripProps) {
  const t = useAppTheme();
  const chrome = useMemo(() => temporalChromeColors(t), [t]);
  const [reduceMotion, setReduceMotion] = useState(false);
  const pinchBase = useRef(PINCH_SCALE_MIN);
  const pinchScale = useRef(new Animated.Value(PINCH_SCALE_MIN)).current;
  const [stripWidth, setStripWidth] = useState(0);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  const onStripLayout = useCallback((e: LayoutChangeEvent) => {
    setStripWidth(e.nativeEvent.layout.width);
  }, []);

  const onPinchEvent = useCallback(
    (e: PinchGestureHandlerGestureEvent) => {
      if (reduceMotion) {
        return;
      }
      const next = Math.min(
        PINCH_SCALE_MAX,
        Math.max(PINCH_SCALE_MIN, pinchBase.current * e.nativeEvent.scale),
      );
      pinchScale.setValue(next);
    },
    [pinchScale, reduceMotion],
  );

  const onPinchStateChange = useCallback((e: PinchGestureHandlerGestureEvent) => {
    if (e.nativeEvent.state === State.END || e.nativeEvent.oldState === State.ACTIVE) {
      pinchBase.current = Math.min(
        PINCH_SCALE_MAX,
        Math.max(PINCH_SCALE_MIN, pinchBase.current * e.nativeEvent.scale),
      );
    }
  }, []);

  if (months.length === 0) {
    return null;
  }

  const blockWidth =
    stripWidth > 0 ? Math.max(3, (stripWidth - (months.length - 1) * 3) / months.length) : 0;

  const row = (
    <View
      testID="temporal-map-density-strip"
      style={styles.row}
      onLayout={onStripLayout}
      accessibilityRole="adjustable"
      accessibilityLabel="Month density. Pinch to zoom blocks."
    >
      {months.map((month) => {
        const activity = monthActivityRatio(month.count, activityMax);
        const isHighlighted = month.monthKey === highlightedMonthKey;
        const fillH = STRIP_MIN_H + (STRIP_MAX_H - STRIP_MIN_H) * activity;
        const heightStyle = reduceMotion
          ? { height: fillH }
          : {
              height: pinchScale.interpolate({
                inputRange: [PINCH_SCALE_MIN, PINCH_SCALE_MAX],
                outputRange: [fillH, fillH * 1.85],
                extrapolate: 'clamp',
              }),
            };
        return (
          <Pressable
            key={month.monthKey}
            testID={`temporal-map-density-${month.monthKey}`}
            accessibilityRole="button"
            accessibilityLabel={`Jump to ${month.monthKey}`}
            onPress={() => onSelectMonth(month.monthKey)}
            style={({ pressed }) => [styles.blockPress, { opacity: pressed ? 0.75 : 1 }]}
          >
            <Animated.View
              style={[
                styles.block,
                {
                  width: blockWidth > 0 ? blockWidth : undefined,
                  flex: blockWidth > 0 ? undefined : 1,
                  backgroundColor: isHighlighted ? chrome.activeAccentBar : chrome.activityFill,
                  opacity: isHighlighted ? 1 : 0.35 + activity * 0.55,
                },
                heightStyle,
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );

  if (reduceMotion || Platform.OS === 'web') {
    return row;
  }

  return (
    <PinchGestureHandler onGestureEvent={onPinchEvent} onHandlerStateChange={onPinchStateChange}>
      <View>{row}</View>
    </PinchGestureHandler>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    minHeight: STRIP_MAX_H,
    marginBottom: 10,
  },
  blockPress: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  block: {
    borderRadius: 2,
    minHeight: STRIP_MIN_H,
  },
});
