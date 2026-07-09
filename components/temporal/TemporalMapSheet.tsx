import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  GestureHandlerRootView,
  NativeViewGestureHandler,
  PanGestureHandler,
  ScrollView,
} from 'react-native-gesture-handler';
import type {
  NativeViewGestureHandler as NativeViewGestureHandlerType,
  PanGestureHandler as PanGestureHandlerType,
} from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MonthKey, MonthSummary } from '../../types/temporal';
import { fonts, screenContentGutter, useAppTheme } from '../../theme';
import {
  formatMonthScrubberLabel,
  formatMonthThoughtCount,
  monthActivityRatio,
} from '../../utils/streamMonthIndex';
import { groupMonthSummariesByYear, maxMonthThoughtCount } from '../../utils/temporalMapGroups';
import { thoughtSheetBackdropA11yLabel } from '../thoughtSheet/backdropAction';
import { useSheetDragDismiss } from '../thoughtSheet/useSheetDragDismiss';
import { useSheetEnterAnimation } from '../thoughtSheet/useSheetEnterAnimation';
import { TemporalMapDensityStrip } from './TemporalMapDensityStrip';
import { temporalChromeColors } from './temporalChrome';

export type TemporalMapSheetProps = {
  visible: boolean;
  months: readonly MonthSummary[];
  highlightedMonthKey: MonthKey | null;
  onClose: () => void;
  onSelectMonth: (monthKey: MonthKey) => void;
  hapticsEnabled?: boolean;
};

const ACTIVITY_BAR_H = 26;
const ACTIVITY_BAR_W = 3;
const SHEET_HEIGHT_RATIO = 0.76;
const CHROME_ESTIMATE = 108;

export function TemporalMapSheet({
  visible,
  months,
  highlightedMonthKey,
  onClose,
  onSelectMonth,
  hapticsEnabled = true,
}: TemporalMapSheetProps) {
  const t = useAppTheme();
  const chrome = useMemo(() => temporalChromeColors(t), [t]);
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radius } = t;
  const contentInset = screenContentGutter(windowWidth);
  const { meta, body } = typography;
  const scrollYRef = useRef(0);
  const closingRef = useRef(false);
  const panRef = useRef<PanGestureHandlerType>(null);
  const scrollGestureRef = useRef<NativeViewGestureHandlerType>(null);

  const sheetMaxHeight = Math.round(windowHeight * SHEET_HEIGHT_RATIO);
  const listMaxHeight = Math.max(120, sheetMaxHeight - CHROME_ESTIMATE);
  const listBottomPadding = Math.max(insets.bottom, spacing.md) + spacing.xl;

  const yearGroups = useMemo(() => groupMonthSummariesByYear(months), [months]);
  const activityMax = useMemo(() => maxMonthThoughtCount(months), [months]);

  const { scrimOpacity, contentOpacity, contentTranslateY } = useSheetEnterAnimation(
    visible,
    highlightedMonthKey ?? 'timeline',
  );
  const scrimColor = 'rgba(0,0,0,0.5)';

  const finishClose = useCallback(() => {
    if (closingRef.current) {
      return;
    }
    closingRef.current = true;
    onClose();
    requestAnimationFrame(() => {
      closingRef.current = false;
    });
  }, [onClose]);

  const {
    dragY,
    onGestureEvent,
    onHandlerStateChange,
    animateDismiss,
    resetDrag,
    scrimDragMultiplier,
  } = useSheetDragDismiss({
    travel: sheetMaxHeight,
    onDismiss: finishClose,
  });

  const playHaptic = useCallback(() => {
    if (!hapticsEnabled || Platform.OS === 'web') {
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [hapticsEnabled]);

  const requestDismiss = useCallback(() => {
    animateDismiss(0, 0);
  }, [animateDismiss]);

  const onMapScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    scrollYRef.current = y;
  }, []);

  const onMapScrollEndDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, velocity } = event.nativeEvent;
      scrollYRef.current = contentOffset.y;
      if (contentOffset.y <= 4 && (velocity?.y ?? 0) > 0.55) {
        animateDismiss(0, 520);
      }
    },
    [animateDismiss],
  );

  useEffect(() => {
    if (!visible) {
      return;
    }
    scrollYRef.current = 0;
    resetDrag();
  }, [visible, highlightedMonthKey, resetDrag]);

  const handleSelectMonth = useCallback(
    (monthKey: MonthKey) => {
      playHaptic();
      onSelectMonth(monthKey);
      animateDismiss(0, 0);
    },
    [animateDismiss, onSelectMonth, playHaptic],
  );

  const sheetTranslateY = useMemo(
    () => Animated.add(contentTranslateY, dragY),
    [contentTranslateY, dragY],
  );

  const combinedScrimOpacity = useMemo(
    () => Animated.multiply(scrimOpacity, scrimDragMultiplier),
    [scrimOpacity, scrimDragMultiplier],
  );

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : 'fullScreen'}
      onRequestClose={requestDismiss}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.rootGestureHost}>
        <View testID="temporal-map-sheet-root" style={styles.root} accessibilityViewIsModal>
          <Animated.View
            pointerEvents="none"
            style={[styles.scrimLayer, { backgroundColor: scrimColor, opacity: combinedScrimOpacity }]}
          />
          <Pressable
            style={styles.dismissRegion}
            onPress={requestDismiss}
            accessibilityRole="button"
            accessibilityLabel={thoughtSheetBackdropA11yLabel()}
          />

          <PanGestureHandler
            ref={panRef}
            simultaneousHandlers={scrollGestureRef}
            activeOffsetY={[-12, 12]}
            failOffsetX={[-28, 28]}
            onGestureEvent={onGestureEvent}
            onHandlerStateChange={onHandlerStateChange}
          >
            <Animated.View
              testID="temporal-map-sheet"
              style={[
                styles.sheet,
                {
                  backgroundColor: colors.bgElevated,
                  borderColor: colors.border,
                  borderTopLeftRadius: radius.lg,
                  borderTopRightRadius: radius.lg,
                  maxHeight: sheetMaxHeight,
                  opacity: contentOpacity,
                  transform: [{ translateY: sheetTranslateY }],
                },
              ]}
            >
              <View style={styles.sheetChrome}>
                <View style={styles.dragStrip}>
                  <View
                    testID="temporal-map-grabber"
                    style={[styles.grabber, { backgroundColor: colors.muted }]}
                    accessibilityRole="adjustable"
                    accessibilityLabel="Drag down to close"
                  />
                </View>

                <View style={[styles.sheetHeader, { paddingHorizontal: contentInset }]}>
                  <Text
                    accessibilityRole="header"
                    style={{
                      color: colors.fg,
                      fontFamily: fonts.medium,
                      fontSize: 17,
                      lineHeight: 24,
                      letterSpacing: -0.2,
                    }}
                  >
                    Timeline
                  </Text>
                  <Text
                    style={{
                      marginTop: 4,
                      color: colors.sectionFg,
                      fontFamily: meta.fontFamily,
                      fontSize: meta.fontSize,
                      lineHeight: 18,
                      letterSpacing: 0.15,
                    }}
                  >
                    Jump to a month in your stream
                  </Text>
                </View>
              </View>

              <NativeViewGestureHandler
                ref={scrollGestureRef}
                waitFor={panRef}
                simultaneousHandlers={panRef}
              >
                <ScrollView
                  testID="temporal-map-scroll"
                  style={[styles.scroll, { maxHeight: listMaxHeight }]}
                  onScroll={onMapScroll}
                  onScrollEndDrag={onMapScrollEndDrag}
                  scrollEventThrottle={16}
                  bounces
                  alwaysBounceVertical
                  nestedScrollEnabled
                  contentContainerStyle={{
                    paddingHorizontal: contentInset,
                    paddingTop: spacing.sm,
                    paddingBottom: listBottomPadding,
                  }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {yearGroups.map((group, groupIndex) => (
                    <View
                      key={String(group.year)}
                      style={groupIndex > 0 ? { marginTop: spacing.lg } : { marginTop: spacing.xs }}
                    >
                      <Text
                        accessibilityRole="header"
                        style={{
                          color: colors.sectionFg,
                          fontFamily: meta.fontFamily,
                          fontSize: 12,
                          lineHeight: 16,
                          letterSpacing: 0.35,
                          marginBottom: spacing.sm,
                          paddingLeft: 2,
                        }}
                      >
                        {group.yearLabel}
                      </Text>
                      <TemporalMapDensityStrip
                        months={group.months}
                        activityMax={activityMax}
                        highlightedMonthKey={highlightedMonthKey}
                        onSelectMonth={handleSelectMonth}
                      />
                      <View
                        style={[
                          styles.monthGroup,
                          {
                            borderColor: colors.border,
                            borderRadius: radius.md,
                          },
                        ]}
                      >
                        {group.months.map((month, monthIndex) => {
                          const isHighlighted = month.monthKey === highlightedMonthKey;
                          const isLast = monthIndex === group.months.length - 1;
                          const countLine = formatMonthThoughtCount(month.count);
                          const activity = monthActivityRatio(month.count, activityMax);
                          const monthLabel = formatMonthScrubberLabel(month.monthKey, month.monthKey);
                          return (
                            <Pressable
                              key={month.monthKey}
                              testID={`temporal-map-month-${month.monthKey}`}
                              accessibilityRole="button"
                              accessibilityLabel={
                                countLine != null ? `${monthLabel}, ${countLine}` : monthLabel
                              }
                              accessibilityHint="Moves the stream to this month"
                              onPress={() => handleSelectMonth(month.monthKey)}
                              style={({ pressed }) => [
                                styles.monthRow,
                                {
                                  borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                                  borderBottomColor: colors.border,
                                  backgroundColor: isHighlighted
                                    ? chrome.mapRowHighlight
                                    : pressed
                                      ? chrome.mapRowPressed
                                      : 'transparent',
                                },
                              ]}
                            >
                              {isHighlighted ? (
                                <View
                                  pointerEvents="none"
                                  style={[
                                    styles.highlightBar,
                                    { backgroundColor: chrome.activeAccentBar },
                                  ]}
                                />
                              ) : null}
                              <View style={styles.monthRowMain}>
                                <Text
                                  style={{
                                    color: isHighlighted ? colors.fg : colors.fgDim,
                                    fontFamily: isHighlighted ? fonts.medium : body.fontFamily,
                                    fontSize: body.fontSize,
                                    lineHeight: body.lineHeight,
                                    letterSpacing: 0.12,
                                  }}
                                >
                                  {monthLabel}
                                </Text>
                                {countLine != null ? (
                                  <Text
                                    style={{
                                      marginTop: 3,
                                      color: colors.muted,
                                      fontFamily: meta.fontFamily,
                                      fontSize: 12,
                                      lineHeight: 16,
                                      letterSpacing: 0.1,
                                    }}
                                  >
                                    {countLine}
                                  </Text>
                                ) : null}
                              </View>
                              {activity > 0 ? (
                                <View
                                  style={[
                                    styles.activityTrack,
                                    { backgroundColor: chrome.activityTrack },
                                  ]}
                                >
                                  <View
                                    style={[
                                      styles.activityFill,
                                      {
                                        flex: activity,
                                        backgroundColor: chrome.activityFill,
                                      },
                                    ]}
                                  />
                                </View>
                              ) : (
                                <View style={styles.activitySpacer} />
                              )}
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </NativeViewGestureHandler>
            </Animated.View>
          </PanGestureHandler>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  rootGestureHost: {
    flex: 1,
  },
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrimLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  dismissRegion: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopWidth: StyleSheet.hairlineWidth,
    width: '100%',
  },
  sheetChrome: {
    width: '100%',
  },
  dragStrip: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  sheetHeader: {
    paddingBottom: 8,
  },
  scroll: {
    width: '100%',
  },
  monthGroup: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingLeft: 14,
    paddingRight: 12,
    gap: 14,
  },
  highlightBar: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  monthRowMain: {
    flex: 1,
    minWidth: 0,
  },
  activityTrack: {
    width: ACTIVITY_BAR_W,
    height: ACTIVITY_BAR_H,
    borderRadius: 2,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  activityFill: {
    width: '100%',
    borderRadius: 2,
    minHeight: 4,
  },
  activitySpacer: {
    width: ACTIVITY_BAR_W,
    height: ACTIVITY_BAR_H,
  },
});
