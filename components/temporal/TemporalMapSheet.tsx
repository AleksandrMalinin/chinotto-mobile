import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useRef } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
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
import { useSheetEnterAnimation } from '../thoughtSheet/useSheetEnterAnimation';
import { useSheetPanActions } from '../thoughtSheet/useSheetPanActions';

export type TemporalMapSheetProps = {
  visible: boolean;
  months: readonly MonthSummary[];
  highlightedMonthKey: MonthKey | null;
  onClose: () => void;
  onSelectMonth: (monthKey: MonthKey) => void;
  hapticsEnabled?: boolean;
};

/**
 * Memory timeline sheet — vertical months by year (not a calendar grid).
 * Shell matches EntryThoughtSheet layout rule (flex dismiss + sheet last child).
 */
export function TemporalMapSheet({
  visible,
  months,
  highlightedMonthKey,
  onClose,
  onSelectMonth,
  hapticsEnabled = true,
}: TemporalMapSheetProps) {
  const t = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radius } = t;
  const contentInset = screenContentGutter(windowWidth);
  const { meta } = typography;
  const scrollYRef = useRef(0);
  const closingRef = useRef(false);

  const yearGroups = useMemo(() => groupMonthSummariesByYear(months), [months]);
  const activityMax = useMemo(() => maxMonthThoughtCount(months), [months]);

  const { scrimOpacity, contentOpacity, contentTranslateY } = useSheetEnterAnimation(
    visible,
    highlightedMonthKey ?? 'timeline',
  );
  const scrimColor = 'rgba(0,0,0,0.48)';

  const playHaptic = useCallback(() => {
    if (!hapticsEnabled || Platform.OS === 'web') {
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [hapticsEnabled]);

  const handleClose = useCallback(() => {
    if (closingRef.current) {
      return;
    }
    closingRef.current = true;
    onClose();
    requestAnimationFrame(() => {
      closingRef.current = false;
    });
  }, [onClose]);

  const { onHandlerStateChange } = useSheetPanActions({
    mode: 'compact',
    scrollYRef,
    onExpand: () => {},
    onCollapse: () => {},
    onDismiss: handleClose,
  });

  const handleSelectMonth = useCallback(
    (monthKey: MonthKey) => {
      playHaptic();
      onSelectMonth(monthKey);
      handleClose();
    },
    [handleClose, onSelectMonth, playHaptic],
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
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.rootGestureHost}>
        <View testID="temporal-map-sheet-root" style={styles.root} accessibilityViewIsModal>
          <Animated.View
            pointerEvents="none"
            style={[styles.scrimLayer, { backgroundColor: scrimColor, opacity: scrimOpacity }]}
          />
          <Pressable
            style={styles.dismissRegion}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel={thoughtSheetBackdropA11yLabel()}
          />

          <View
            testID="temporal-map-sheet"
            style={[
              styles.sheet,
              {
                backgroundColor: colors.bgElevated,
                borderColor: colors.border,
                borderTopLeftRadius: radius.lg,
                borderTopRightRadius: radius.lg,
                paddingBottom: Math.max(insets.bottom, spacing.md),
                maxHeight: '72%',
              },
            ]}
          >
            <Animated.View
              style={{
                opacity: contentOpacity,
                transform: [{ translateY: contentTranslateY }],
              }}
            >
              <PanGestureHandler
                onHandlerStateChange={onHandlerStateChange}
                activeOffsetY={[-12, 12]}
                failOffsetX={[-24, 24]}
              >
                <View style={styles.dragStrip}>
                  <View
                    testID="temporal-map-grabber"
                    style={[styles.grabber, { backgroundColor: colors.muted }]}
                    accessibilityRole="adjustable"
                    accessibilityLabel="Drag down to close"
                  />
                </View>
              </PanGestureHandler>

              <ScrollView
                testID="temporal-map-scroll"
                style={styles.scroll}
                contentContainerStyle={{
                  paddingHorizontal: contentInset,
                  paddingBottom: spacing.md,
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {yearGroups.map((group, groupIndex) => (
                  <View
                    key={String(group.year)}
                    style={groupIndex > 0 ? { marginTop: spacing.lg } : undefined}
                  >
                    <Text
                      accessibilityRole="header"
                      style={[
                        styles.yearHeader,
                        {
                          color: colors.sectionFg,
                          fontFamily: meta.fontFamily,
                          fontSize: meta.fontSize,
                          letterSpacing: 0.25,
                          marginBottom: spacing.sm,
                        },
                      ]}
                    >
                      {group.yearLabel}
                    </Text>
                    {group.months.map((month) => {
                      const isHighlighted = month.monthKey === highlightedMonthKey;
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
                              borderBottomColor: colors.border,
                              backgroundColor: isHighlighted
                                ? t.isDark
                                  ? 'rgba(128, 138, 188, 0.12)'
                                  : 'rgba(100, 110, 180, 0.08)'
                                : pressed
                                  ? t.isDark
                                    ? 'rgba(128, 138, 188, 0.08)'
                                    : 'rgba(100, 110, 180, 0.05)'
                                  : 'transparent',
                            },
                          ]}
                        >
                          <View style={styles.monthRowMain}>
                            <Text
                              style={{
                                color: colors.fg,
                                fontFamily: fonts.regular,
                                fontSize: 17,
                                lineHeight: 24,
                                letterSpacing: 0.1,
                              }}
                            >
                              {monthLabel}
                            </Text>
                            {countLine != null ? (
                              <Text
                                style={{
                                  marginTop: 2,
                                  color: colors.muted,
                                  fontFamily: meta.fontFamily,
                                  fontSize: 12,
                                  lineHeight: 16,
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
                                { backgroundColor: t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
                              ]}
                            >
                              <View
                                style={[
                                  styles.activityFill,
                                  {
                                    width: `${Math.round(activity * 100)}%`,
                                    backgroundColor: t.isDark
                                      ? 'rgba(160, 170, 220, 0.35)'
                                      : 'rgba(100, 110, 180, 0.28)',
                                  },
                                ]}
                              />
                            </View>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </ScrollView>
            </Animated.View>
          </View>
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
  },
  scrimLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  dismissRegion: {
    flex: 1,
  },
  sheet: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dragStrip: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 8,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  scroll: {
    flexGrow: 0,
  },
  yearHeader: {},
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  monthRowMain: {
    flex: 1,
    minWidth: 0,
  },
  activityTrack: {
    width: 40,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  activityFill: {
    height: '100%',
    borderRadius: 2,
  },
});
