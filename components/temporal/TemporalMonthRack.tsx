import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  TEMPORAL_MONTH_RACK_CHROME_WIDTH,
  TEMPORAL_MONTH_RACK_COMPACT_HEIGHT,
  TEMPORAL_MONTH_RACK_COMPACT_LONG_PRESS_MS,
  TEMPORAL_MONTH_RACK_FADE_MS,
  TEMPORAL_MONTH_RACK_MAX_HEIGHT,
  TEMPORAL_MONTH_RACK_PAD_H,
  TEMPORAL_MONTH_RACK_ROW_HEIGHT,
  TEMPORAL_MONTH_RACK_YEAR_HEIGHT,
  TEMPORAL_RACK_BOTTOM_INSET,
} from '../../constants/temporalNavigation';
import { fonts, useAppTheme } from '../../theme';
import type { MonthKey, MonthSummary } from '../../types/temporal';
import {
  formatMonthRackCompactLabels,
  formatMonthRackLabel,
  formatMonthRackYearLabel,
  formatMonthScrubberLabel,
  yearFromMonthKey,
} from '../../utils/streamMonthIndex';
import {
  findMonthIndex,
  monthRackIndexFromScrollOffset,
  monthRackLabelColor,
  monthRackNeedsScrollFade,
  monthRackPlaqueOutline,
  monthRackRowVisual,
  monthRackScrollOffsetForIndex,
  monthRackScrollViewportHeight,
} from '../../utils/monthRack';
import { getTemporalRackCompact, setTemporalRackCompact } from '../../storage/temporalRackPrefs';
import { temporalChromeColors } from './temporalChrome';

const FADE_EASING = Easing.out(Easing.cubic);
const LABEL_LINE_HEIGHT = 14;

export type TemporalMonthRackProps = {
  months: readonly MonthSummary[];
  streamMonthKey: MonthKey;
  visible: boolean;
  rightInset: number;
  /** Bottom inset above home indicator (include safe area from screen). */
  bottomInset?: number;
  onScrubbingChange?: (scrubbing: boolean) => void;
  onMonthCommitted: (monthKey: MonthKey) => void;
  onActiveMonthPress: () => void;
  hapticsEnabled?: boolean;
  onMonthBoundaryHaptic?: () => void;
};

export function TemporalMonthRack({
  months,
  streamMonthKey,
  visible,
  rightInset,
  bottomInset = TEMPORAL_RACK_BOTTOM_INSET,
  onScrubbingChange,
  onMonthCommitted,
  onActiveMonthPress,
  hapticsEnabled = true,
  onMonthBoundaryHaptic,
}: TemporalMonthRackProps) {
  const t = useAppTheme();
  const chrome = useMemo(() => temporalChromeColors(t), [t]);
  const scrollRef = useRef<ScrollView>(null);
  const hostOpacity = useRef(new Animated.Value(0)).current;
  const scrubbingRef = useRef(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const programmaticScrollRef = useRef(false);
  const lastHapticIndexRef = useRef(-1);
  const [scrollOffsetY, setScrollOffsetY] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const yearOpacity = useRef(new Animated.Value(1)).current;
  const displayedYearRef = useRef<number | null>(null);
  const [compact, setCompact] = useState(false);
  const compactPrefLoadedRef = useRef(false);

  const monthKeys = useMemo(() => months.map((m) => m.monthKey), [months]);
  const monthCount = monthKeys.length;
  const scrollViewportHeight = monthRackScrollViewportHeight(monthCount);
  const expandedBodyHeight = TEMPORAL_MONTH_RACK_YEAR_HEIGHT + scrollViewportHeight;
  const showScrollFade = monthRackNeedsScrollFade(monthCount);
  const fadeBandHeight = Math.min(20, Math.max(12, Math.round(scrollViewportHeight * 0.28)));
  const centerPadding = Math.max(0, (scrollViewportHeight - TEMPORAL_MONTH_RACK_ROW_HEIGHT) / 2);

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
    if (compactPrefLoadedRef.current) {
      return;
    }
    compactPrefLoadedRef.current = true;
    void getTemporalRackCompact().then(setCompact);
  }, []);

  const playToggleHaptic = useCallback(() => {
    if (!hapticsEnabled || Platform.OS === 'web') {
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [hapticsEnabled]);

  useEffect(() => {
    const target = visible ? 1 : 0;
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
  }, [streamMonthKey, monthKeys, syncScrollToMonth, reduceMotion, scrollViewportHeight]);

  useEffect(() => {
    if (displayedYearRef.current === activeYear) {
      return;
    }
    displayedYearRef.current = activeYear;
    if (reduceMotion) {
      yearOpacity.setValue(1);
      return;
    }
    yearOpacity.setValue(0.4);
    Animated.timing(yearOpacity, {
      toValue: 1,
      duration: 200,
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
      setIsScrubbing(next);
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

  const enterCompact = useCallback(() => {
    setScrubbing(false);
    setCompact(true);
    void setTemporalRackCompact(true);
    playToggleHaptic();
  }, [playToggleHaptic, setScrubbing]);

  const leaveCompact = useCallback(() => {
    setCompact(false);
    void setTemporalRackCompact(false);
    playToggleHaptic();
  }, [playToggleHaptic]);

  if (monthKeys.length === 0) {
    return null;
  }

  const railBorderColor = isScrubbing ? chrome.rackBorderActive : chrome.rackBorder;
  const compactLabels = formatMonthRackCompactLabels(streamMonthKey);
  const compactAccessibilityLabel = formatMonthScrubberLabel(streamMonthKey, streamMonthKey);
  const compactBorderColor = chrome.compactBorder;
  const compactOutline = monthRackPlaqueOutline(
    TEMPORAL_MONTH_RACK_COMPACT_HEIGHT,
    compactBorderColor,
  );
  const expandedOutline = monthRackPlaqueOutline(expandedBodyHeight, railBorderColor);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.host,
        compact ? styles.hostCompact : styles.hostExpanded,
        { right: rightInset, paddingBottom: compact ? bottomInset : 0 },
      ]}
      testID="temporal-month-rack-host"
    >
      <Animated.View
        style={[styles.rackWrap, { opacity: hostOpacity }]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        {compact ? (
          <View style={[styles.shadowWrap, chrome.compactShadow]}>
            <View style={compactOutline.outer}>
              <Pressable
                testID="temporal-month-rack-compact"
                accessibilityRole="button"
                accessibilityLabel={compactAccessibilityLabel}
                accessibilityHint="Expands month timeline"
                onPress={leaveCompact}
                style={({ pressed }) => [
                  compactOutline.inner,
                  styles.compactRail,
                  {
                    backgroundColor: chrome.compactSurface,
                    opacity: pressed ? 0.92 : 1,
                  },
                ]}
              >
                <View style={styles.compactLabelStack}>
                  <Text
                    testID="temporal-month-rack-compact-year"
                    style={[
                      styles.compactYearText,
                      {
                        color: chrome.compactYearLabel,
                        fontFamily: fonts.regular,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {compactLabels.yearLabel}
                  </Text>
                  <Text
                    testID="temporal-month-rack-compact-month"
                    style={[
                      styles.compactMonthText,
                      {
                        color: chrome.monthActive,
                        fontFamily: fonts.medium,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {compactLabels.monthLabel}
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={[styles.shadowWrap, chrome.rackShadow]}>
            <View style={expandedOutline.outer}>
              <View
                testID="temporal-month-rack-expanded"
                style={[
                  expandedOutline.inner,
                  styles.rail,
                  { backgroundColor: chrome.rackSurface },
                ]}
              >
                <Pressable
                  testID="temporal-month-rack-year-header"
                  accessibilityRole="header"
                  accessibilityLabel={yearLabel}
                  accessibilityHint="Long press to minimize month timeline"
                  delayLongPress={TEMPORAL_MONTH_RACK_COMPACT_LONG_PRESS_MS}
                  onLongPress={enterCompact}
                  style={styles.yearBlockPressable}
                >
                  <Animated.View style={[styles.yearBlock, { opacity: yearOpacity }]}>
                    <Text
                      testID="temporal-month-rack-year"
                      accessibilityRole="text"
                      style={[
                        styles.yearText,
                        {
                          color: chrome.yearLabel,
                          fontFamily: fonts.regular,
                        },
                      ]}
                    >
                      {yearLabel}
                    </Text>
                    <View style={[styles.yearRule, { backgroundColor: chrome.rackBorder }]} />
                  </Animated.View>
                </Pressable>

                <View
                  testID="temporal-month-rack-scroll-area"
                  style={[styles.scrollArea, { height: scrollViewportHeight }]}
                >
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
                    contentContainerStyle={{ paddingVertical: centerPadding }}
                  >
                    {months.map((month, index) => {
                      const delta = index - activeIndex;
                      const visual = monthRackRowVisual(delta, reduceMotion);
                      const label = formatMonthRackLabel(month.monthKey);
                      const accessibilityLabel = formatMonthScrubberLabel(
                        month.monthKey,
                        month.monthKey,
                      );
                      const isCenter = delta === 0;
                      const labelColor = monthRackLabelColor(delta, chrome);
                      return (
                        <Pressable
                          key={month.monthKey}
                          testID={
                            isCenter
                              ? 'temporal-month-rack-active'
                              : `temporal-month-rack-row-${month.monthKey}`
                          }
                          accessibilityRole="button"
                          accessibilityLabel={accessibilityLabel}
                          accessibilityHint={
                            isCenter ? 'Opens timeline of months' : 'Moves the stream to this month'
                          }
                          onPress={() => {
                            if (scrubbingRef.current) {
                              return;
                            }
                            if (isCenter) {
                              onActiveMonthPress();
                              return;
                            }
                            syncScrollToMonth(month.monthKey, true);
                            onMonthCommitted(month.monthKey);
                          }}
                          style={({ pressed }) => [
                            styles.row,
                            {
                              height: TEMPORAL_MONTH_RACK_ROW_HEIGHT,
                              opacity: visual.opacity,
                              backgroundColor: isCenter
                                ? pressed
                                  ? chrome.mapRowPressed
                                  : chrome.activeRowFill
                                : 'transparent',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.labelText,
                              {
                                fontFamily: isCenter ? fonts.medium : fonts.regular,
                                fontSize: 11,
                                lineHeight: LABEL_LINE_HEIGHT,
                                color: labelColor,
                                letterSpacing: 0.1,
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

                {showScrollFade ? (
                  <>
                    <LinearGradient
                      pointerEvents="none"
                      colors={[chrome.rackSurface, chrome.rackFadeTo]}
                      style={[
                        styles.fadeTop,
                        { top: TEMPORAL_MONTH_RACK_YEAR_HEIGHT, height: fadeBandHeight },
                      ]}
                    />
                    <LinearGradient
                      pointerEvents="none"
                      colors={[chrome.rackFadeTo, chrome.rackSurface]}
                      style={[styles.fadeBottom, { height: fadeBandHeight }]}
                    />
                  </>
                ) : null}
              </View>
            </View>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    zIndex: 3,
    top: 0,
    bottom: 0,
    width: TEMPORAL_MONTH_RACK_CHROME_WIDTH,
  },
  hostExpanded: {
    justifyContent: 'center',
  },
  hostCompact: {
    justifyContent: 'flex-end',
  },
  rackWrap: {
    width: '100%',
    maxHeight: TEMPORAL_MONTH_RACK_MAX_HEIGHT,
  },
  shadowWrap: {
    width: '100%',
    overflow: 'visible',
  },
  compactRail: {
    width: '100%',
    height: TEMPORAL_MONTH_RACK_COMPACT_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: TEMPORAL_MONTH_RACK_PAD_H,
  },
  compactLabelStack: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  compactYearText: {
    flexShrink: 0,
    textAlign: 'center',
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.2,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
  compactMonthText: {
    flexShrink: 0,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: 0.15,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
  rail: {
    width: '100%',
  },
  yearBlockPressable: {
    width: '100%',
  },
  yearBlock: {
    height: TEMPORAL_MONTH_RACK_YEAR_HEIGHT,
    width: '100%',
    paddingHorizontal: TEMPORAL_MONTH_RACK_PAD_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearText: {
    width: '100%',
    textAlign: 'center',
    fontSize: 10,
    lineHeight: LABEL_LINE_HEIGHT,
    letterSpacing: 0.2,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
  yearRule: {
    position: 'absolute',
    left: TEMPORAL_MONTH_RACK_PAD_H,
    right: TEMPORAL_MONTH_RACK_PAD_H,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
  scrollArea: {
    width: '100%',
  },
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: TEMPORAL_MONTH_RACK_PAD_H,
  },
  labelText: {
    flexShrink: 0,
    textAlign: 'right',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
  fadeTop: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  fadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});
