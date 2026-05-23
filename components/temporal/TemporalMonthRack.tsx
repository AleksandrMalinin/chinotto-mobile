import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  TEMPORAL_MONTH_RACK_CHROME_WIDTH,
  TEMPORAL_MONTH_RACK_FADE_MS,
  TEMPORAL_MONTH_RACK_ROW_HEIGHT,
} from '../../constants/temporalNavigation';
import { fonts, useAppTheme } from '../../theme';
import type { MonthKey, MonthSummary } from '../../types/temporal';
import {
  formatMonthRackLabel,
  formatMonthRackYearLabel,
  formatMonthScrubberLabel,
  yearFromMonthKey,
} from '../../utils/streamMonthIndex';
import {
  findMonthIndex,
  monthRackIndexFromScrollOffset,
  monthRackRowVisual,
  monthRackScrollOffsetForIndex,
} from '../../utils/monthRack';

const FADE_EASING = Easing.out(Easing.cubic);
const YEAR_HEADER_HEIGHT = 16;

export type TemporalMonthRackProps = {
  months: readonly MonthSummary[];
  /** Month derived from stream scroll (when user is not scrubbing the rack). */
  streamMonthKey: MonthKey;
  visible: boolean;
  rightInset: number;
  topInset: number;
  bottomInset: number;
  onScrubbingChange?: (scrubbing: boolean) => void;
  /** Fired when scrub settles on a month (drag release / momentum end). */
  onMonthCommitted: (monthKey: MonthKey) => void;
  /** Tap on the centered (active) month — opens temporal map later. */
  onActiveMonthPress: () => void;
  hapticsEnabled?: boolean;
  onMonthBoundaryHaptic?: () => void;
};

export function TemporalMonthRack({
  months,
  streamMonthKey,
  visible,
  rightInset,
  topInset,
  bottomInset,
  onScrubbingChange,
  onMonthCommitted,
  onActiveMonthPress,
  hapticsEnabled = true,
  onMonthBoundaryHaptic,
}: TemporalMonthRackProps) {
  const t = useAppTheme();
  const scrollRef = useRef<ScrollView>(null);
  const hostOpacity = useRef(new Animated.Value(0)).current;
  const scrubbingRef = useRef(false);
  const programmaticScrollRef = useRef(false);
  const lastHapticIndexRef = useRef(-1);
  const [scrollAreaHeight, setScrollAreaHeight] = useState(0);
  const [scrollOffsetY, setScrollOffsetY] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const yearOpacity = useRef(new Animated.Value(1)).current;
  const displayedYearRef = useRef<number | null>(null);

  const monthKeys = useMemo(() => months.map((m) => m.monthKey), [months]);
  const centerPadding = Math.max(0, (scrollAreaHeight - TEMPORAL_MONTH_RACK_ROW_HEIGHT) / 2);

  const activeIndex = monthRackIndexFromScrollOffset(scrollOffsetY, monthKeys.length);
  const activeMonthKey = monthKeys[activeIndex] ?? streamMonthKey;
  const activeYear = yearFromMonthKey(activeMonthKey);
  const yearLabel = formatMonthRackYearLabel(activeMonthKey);

  const syncScrollToMonth = useCallback(
    (monthKey: MonthKey, animated: boolean) => {
      if (monthKeys.length === 0 || scrollRef.current == null) {
        return;
      }
      const index = findMonthIndex(monthKeys, monthKey);
      const y = monthRackScrollOffsetForIndex(index);
      programmaticScrollRef.current = true;
      scrollRef.current.scrollTo({ y, animated });
      setScrollOffsetY(y);
      lastHapticIndexRef.current = index;
      requestAnimationFrame(() => {
        programmaticScrollRef.current = false;
      });
    },
    [monthKeys],
  );

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    const target = visible ? 0.92 : 0;
    if (reduceMotion) {
      hostOpacity.setValue(target);
      return;
    }
    Animated.timing(hostOpacity, {
      toValue: target,
      duration: TEMPORAL_MONTH_RACK_FADE_MS,
      easing: FADE_EASING,
      useNativeDriver: true,
    }).start();
  }, [visible, hostOpacity, reduceMotion]);

  useEffect(() => {
    if (scrubbingRef.current || monthKeys.length === 0) {
      return;
    }
    syncScrollToMonth(streamMonthKey, !reduceMotion);
  }, [streamMonthKey, monthKeys, syncScrollToMonth, reduceMotion]);

  const onScrollAreaLayout = useCallback((e: LayoutChangeEvent) => {
    setScrollAreaHeight(e.nativeEvent.layout.height);
  }, []);

  useEffect(() => {
    if (displayedYearRef.current === activeYear) {
      return;
    }
    displayedYearRef.current = activeYear;
    if (reduceMotion) {
      yearOpacity.setValue(1);
      return;
    }
    yearOpacity.setValue(0.35);
    Animated.timing(yearOpacity, {
      toValue: 1,
      duration: 180,
      easing: FADE_EASING,
      useNativeDriver: true,
    }).start();
  }, [activeYear, reduceMotion, yearOpacity]);

  const fireBoundaryHaptic = useCallback(
    (index: number) => {
      if (!hapticsEnabled || index === lastHapticIndexRef.current) {
        return;
      }
      lastHapticIndexRef.current = index;
      onMonthBoundaryHaptic?.();
    },
    [hapticsEnabled, onMonthBoundaryHaptic],
  );

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      setScrollOffsetY(y);
      if (programmaticScrollRef.current) {
        return;
      }
      const idx = monthRackIndexFromScrollOffset(y, monthKeys.length);
      fireBoundaryHaptic(idx);
    },
    [fireBoundaryHaptic, monthKeys.length],
  );

  const setScrubbing = useCallback(
    (next: boolean) => {
      if (scrubbingRef.current === next) {
        return;
      }
      scrubbingRef.current = next;
      onScrubbingChange?.(next);
    },
    [onScrubbingChange],
  );

  const commitActiveMonth = useCallback(() => {
    if (monthKeys.length === 0) {
      return;
    }
    onMonthCommitted(activeMonthKey);
  }, [activeMonthKey, monthKeys.length, onMonthCommitted]);

  const onScrollBeginDrag = useCallback(() => {
    setScrubbing(true);
  }, [setScrubbing]);

  const onScrollEnd = useCallback(() => {
    if (programmaticScrollRef.current) {
      return;
    }
    const wasScrubbing = scrubbingRef.current;
    setScrubbing(false);
    if (wasScrubbing) {
      commitActiveMonth();
    }
  }, [commitActiveMonth, setScrubbing]);

  if (monthKeys.length === 0) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { right: rightInset, top: topInset, bottom: bottomInset }]}
      testID="temporal-month-rack-host"
    >
      <Animated.View
        style={[styles.rackWrap, { opacity: hostOpacity }]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <View style={styles.rail}>
          <Animated.View style={[styles.yearHeader, { opacity: yearOpacity }]}>
            <Text
              testID="temporal-month-rack-year"
              accessibilityRole="text"
              style={[
                styles.yearText,
                {
                  fontFamily: fonts.regular,
                  fontSize: 9,
                  color: t.colors.muted,
                  letterSpacing: 0.35,
                  opacity: 0.88,
                },
              ]}
              numberOfLines={1}
            >
              {yearLabel}
            </Text>
          </Animated.View>
          <View style={styles.scrollArea} onLayout={onScrollAreaLayout}>
          <ScrollView
            ref={scrollRef}
            testID="temporal-month-rack-scroll"
            showsVerticalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={TEMPORAL_MONTH_RACK_ROW_HEIGHT}
            snapToAlignment="start"
            scrollEventThrottle={16}
            onScroll={onScroll}
            onScrollBeginDrag={onScrollBeginDrag}
            onScrollEndDrag={onScrollEnd}
            onMomentumScrollEnd={onScrollEnd}
            contentContainerStyle={{
              paddingVertical: centerPadding,
            }}
          >
            {months.map((month, index) => {
              const delta = index - activeIndex;
              const visual = monthRackRowVisual(delta, reduceMotion);
              const label = formatMonthRackLabel(month.monthKey);
              const accessibilityLabel = formatMonthScrubberLabel(month.monthKey, month.monthKey);
              const isCenter = delta === 0;
              return (
                <Pressable
                  key={month.monthKey}
                  testID={isCenter ? 'temporal-month-rack-active' : `temporal-month-rack-row-${month.monthKey}`}
                  accessibilityRole={isCenter ? 'button' : 'text'}
                  accessibilityLabel={accessibilityLabel}
                  accessibilityHint={isCenter ? 'Opens timeline of months' : undefined}
                  disabled={!isCenter}
                  onPress={isCenter ? onActiveMonthPress : undefined}
                  style={[
                    styles.row,
                    {
                      height: TEMPORAL_MONTH_RACK_ROW_HEIGHT,
                      opacity: visual.opacity,
                      transform: [{ scale: visual.scale }],
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.rowText,
                      {
                        fontFamily: fonts.regular,
                        fontSize: isCenter ? 10 : 9,
                        color: t.colors.metaFg,
                        fontWeight: isCenter ? '500' : '400',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    zIndex: 3,
    width: TEMPORAL_MONTH_RACK_CHROME_WIDTH,
    justifyContent: 'center',
  },
  rackWrap: {
    flex: 1,
    maxHeight: 220,
    justifyContent: 'center',
  },
  rail: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  yearHeader: {
    height: YEAR_HEADER_HEIGHT,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 2,
  },
  yearText: {
    textAlign: 'right',
  },
  scrollArea: {
    flex: 1,
  },
  row: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 2,
    paddingLeft: 4,
  },
  rowText: {
    letterSpacing: 0.12,
    textAlign: 'right',
  },
});
