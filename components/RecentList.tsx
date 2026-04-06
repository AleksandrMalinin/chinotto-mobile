import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import type { Entry } from '../types/entry';
import { fonts, screenContentGutter, screenContentInnerPad, useAppTheme } from '../theme';
import { replaceHttpUrlsWithCompactDisplay } from '../utils/extractHttpUrlsFromText';
import { formatEntryTime, groupEntriesByDate } from '../utils/groupEntriesByDate';
import { StreamFlowPanel } from './StreamFlowPanel';

/**
 * Time-grouped stream — section labels (`.stream-section-title`), entry rows with
 * hairline separators like desktop `.entry-row` / `var(--border)`, plus inline time.
 *
 * Delete: **swipe left** past threshold (reveals delete track, commits on open) — intentional gesture only;
 * local-first + tombstone queue (see `deleteEntry`).
 */
export type RecentListProps = {
  entries: Entry[];
  visible: boolean;
  /** Shown when `visible` and there are no rows (e.g. search had no hits). */
  emptyHint?: string;
  /** Muted line below the list (e.g. search capped at N results). */
  listFooterHint?: string;
  /** Opens full-text read sheet (companion recall). */
  onEntryPress?: (entry: Entry) => void;
  onEntryDelete?: (entry: Entry) => void;
  /** Row id for a brief leading-edge trace (e.g. just saved from capture or share). */
  highlightEntryId?: string | null;
  /**
   * When true and the stream is empty, show the same slow line + blob motion as welcome
   * (`StreamFlowPanel`) above the hint — not for search-miss empty.
   */
  streamEmptyAmbient?: boolean;
  /**
   * When true, fade the empty stream illustration + copy (composer has text or voice is active).
   */
  streamEmptyAmbientSuppressed?: boolean;
};

const DELETE_ACTION_WIDTH = 76;

/** Parent should clear `highlightEntryId` after this (full fade + small buffer). */
export const STREAM_HIGHLIGHT_CLEAR_AFTER_MS = 0;

/** Aligns with `WelcomeOnboardingScreen` staged entrance — fade + slight lift. */
const EMPTY_HINT_ENTRANCE_MS = 1100;
const EMPTY_HINT_STAGGER_MS = 280;
const EMPTY_HINT_Y_OFFSET = 7;
const EMPTY_HINT_EASING = Easing.out(Easing.cubic);
/** Let stream illustration lead through first beats before copy fades in. */
const EMPTY_AMBIENT_BEFORE_COPY_MS = 1150;
const EMPTY_AMBIENT_SUPPRESS_FADE_MS = 340;

/** Pressed stream row — full-bleed tint, softer than a card fill. */
function entryPressedBackground(isDark: boolean): string {
  return isDark ? 'rgba(128, 138, 188, 0.085)' : 'rgba(100, 110, 180, 0.072)';
}

type StreamRowProps = {
  item: Entry;
  isLastInSection: boolean;
  isNewest: boolean;
  /** Matches `CaptureScreen` scroll `paddingHorizontal` so rows can full-bleed under press/trace. */
  streamGutter: number;
  onEntryPress?: (entry: Entry) => void;
  onEntryDelete?: (entry: Entry) => void;
};

function RecentStreamRow({
  item,
  isLastInSection,
  isNewest,
  streamGutter,
  onEntryPress,
  onEntryDelete,
}: StreamRowProps) {
  const [pressed, setPressed] = useState(false);
  const t = useAppTheme();
  const { colors, typography, isDark } = t;
  const { body } = typography;
  const lineDisplay = replaceHttpUrlsWithCompactDisplay(item.text);

  const onPressIn = useCallback(() => {
    setPressed(true);
  }, []);
  const onPressOut = useCallback(() => {
    setPressed(false);
  }, []);

  const rowContent = (
    <View
      style={[
        styles.rowOuter,
        styles.rowOuterRelative,
        !isLastInSection && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.streamDivider,
        },
      ]}
    >
      {pressed ? (
        <View
          pointerEvents="none"
          importantForAccessibility="no"
          style={[
            styles.streamRowPressShade,
            { backgroundColor: entryPressedBackground(isDark) },
          ]}
        />
      ) : null}
      <Pressable
        accessible={true}
        accessibilityLabel={`${item.text}, ${formatEntryTime(item.createdAt)}`}
        accessibilityHint={
          [
            onEntryPress != null ? 'Double tap to read full text' : null,
            onEntryDelete != null ? 'Swipe left to delete' : null,
          ]
            .filter(Boolean)
            .join('. ') || undefined
        }
        accessibilityActions={onEntryDelete != null ? [{ name: 'delete', label: 'Delete' }] : undefined}
        onAccessibilityAction={
          onEntryDelete != null
            ? ({ nativeEvent }) => {
                if (nativeEvent.actionName === 'delete') {
                  onEntryDelete(item);
                }
              }
            : undefined
        }
        testID={`recent-entry-${item.id}`}
        onPress={onEntryPress != null ? () => onEntryPress(item) : undefined}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        delayPressIn={0}
        style={styles.pressableAboveTrace}
        {...(Platform.OS === 'android' ? { android_ripple: null } : {})}
      >
        <View style={styles.entryBlock}>
          <View
            style={[
              styles.entryRow,
              { paddingHorizontal: streamGutter + screenContentInnerPad },
            ]}
          >
            <Text
              style={[
                styles.line,
                {
                  flex: 1,
                  color: t.sunlightMode
                    ? isNewest
                      ? colors.entryBody
                      : colors.fgDim
                    : colors.entryBody,
                  fontFamily: isNewest ? fonts.medium : body.fontFamily,
                  fontSize: isNewest ? 17 : body.fontSize,
                  lineHeight: isNewest ? 26 : body.lineHeight,
                  letterSpacing: isNewest ? 0.17 : 0.16,
                  marginRight: t.spacing.sm,
                  opacity: t.sunlightMode ? 1 : isNewest ? 1 : 0.84,
                },
              ]}
              numberOfLines={4}
            >
              {lineDisplay}
            </Text>
            <Text
              style={[
                styles.time,
                {
                  color: colors.muted,
                  fontFamily: t.sunlightMode ? fonts.medium : fonts.regular,
                  fontSize: 11,
                  lineHeight: 15,
                },
              ]}
            >
              {formatEntryTime(item.createdAt)}
            </Text>
          </View>
        </View>
      </Pressable>
    </View>
  );

  if (onEntryDelete == null) {
    return rowContent;
  }

  return (
    <Swipeable
      friction={2}
      overshootRight={false}
      renderRightActions={() => (
        <View
          style={[
            styles.deleteTrack,
            {
              width: DELETE_ACTION_WIDTH,
              backgroundColor: colors.swipeDeleteBg,
              borderLeftWidth: StyleSheet.hairlineWidth,
              borderLeftColor: colors.borderFocus,
            },
          ]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Text
            style={[
              styles.deleteLabel,
              { fontFamily: fonts.medium, color: colors.fg },
            ]}
          >
            Delete
          </Text>
        </View>
      )}
      onSwipeableOpen={() => onEntryDelete(item)}
    >
      {rowContent}
    </Swipeable>
  );
}

function streamEmptyHintEntranceStyle(v: Animated.Value) {
  return {
    opacity: v,
    transform: [
      {
        translateY: v.interpolate({
          inputRange: [0, 1],
          outputRange: [EMPTY_HINT_Y_OFFSET, 0],
        }),
      },
    ],
  };
}

type StreamEmptyHintProps = {
  emptyHint: string;
  streamGutter: number;
  bodyFontFamily: string;
  bodyFontSize: number;
  bodyLineHeight: number;
  color: string;
  paddingTop: number;
  entranceDelayMs?: number;
  /** When set, lines are optically grouped with centered stream art. */
  textAlign?: 'left' | 'center';
};

function StreamEmptyHint({
  emptyHint,
  streamGutter,
  bodyFontFamily,
  bodyFontSize,
  bodyLineHeight,
  color,
  paddingTop,
  entranceDelayMs = 0,
  textAlign = 'left',
}: StreamEmptyHintProps) {
  const line0 = useRef(new Animated.Value(0)).current;
  const line1 = useRef(new Animated.Value(0)).current;
  const lines = useMemo(() => emptyHint.split(/\n/).map((s) => s.trim()).filter(Boolean), [emptyHint]);
  const twoLines = lines.length >= 2;
  const textStyle = useMemo(
    () => ({
      color,
      fontFamily: bodyFontFamily,
      fontSize: bodyFontSize,
      lineHeight: bodyLineHeight,
      textAlign,
    }),
    [bodyFontFamily, bodyFontSize, bodyLineHeight, color, textAlign]
  );

  useEffect(() => {
    let cancelled = false;
    line0.setValue(0);
    line1.setValue(0);
    void AccessibilityInfo.isReduceMotionEnabled().then((rm) => {
      if (cancelled) {
        return;
      }
      if (rm) {
        line0.setValue(1);
        line1.setValue(1);
        return;
      }
      const fadeUp = (v: Animated.Value) =>
        Animated.timing(v, {
          toValue: 1,
          duration: EMPTY_HINT_ENTRANCE_MS,
          easing: EMPTY_HINT_EASING,
          useNativeDriver: true,
        });
      const delayMs = Math.max(0, entranceDelayMs);
      if (!twoLines) {
        Animated.sequence([Animated.delay(delayMs), fadeUp(line0)]).start();
        line1.setValue(1);
        return;
      }
      Animated.parallel([
        Animated.sequence([Animated.delay(delayMs), fadeUp(line0)]),
        Animated.sequence([Animated.delay(delayMs + EMPTY_HINT_STAGGER_MS), fadeUp(line1)]),
      ]).start();
    });
    return () => {
      cancelled = true;
      line0.stopAnimation();
      line1.stopAnimation();
    };
  }, [emptyHint, twoLines, entranceDelayMs]);

  return (
    <View
      testID="recent-list-empty-hint"
      accessible
      accessibilityRole="text"
      accessibilityLabel={emptyHint}
      style={[
        styles.emptyHint,
        textAlign === 'center' && styles.emptyHintCentered,
        {
          paddingHorizontal: streamGutter,
          paddingTop,
        },
      ]}
    >
      <Animated.Text style={[textStyle, streamEmptyHintEntranceStyle(line0)]} importantForAccessibility="no">
        {lines[0] ?? emptyHint}
      </Animated.Text>
      {twoLines ? (
        <Animated.Text style={[textStyle, streamEmptyHintEntranceStyle(line1)]} importantForAccessibility="no">
          {lines[1]}
        </Animated.Text>
      ) : null}
    </View>
  );
}

function RecentListInner({
  entries,
  visible,
  emptyHint,
  listFooterHint,
  onEntryPress,
  onEntryDelete,
  highlightEntryId = null,
  streamEmptyAmbient = false,
  streamEmptyAmbientSuppressed = false,
}: RecentListProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const streamGutter = screenContentGutter(windowWidth);
  const t = useAppTheme();
  const { colors, typography } = t;
  const { body, meta } = typography;
  const emptyAmbientOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!streamEmptyAmbient) {
      return;
    }
    let cancelled = false;
    const target = streamEmptyAmbientSuppressed ? 0 : 1;
    const timing = Animated.timing(emptyAmbientOpacity, {
      toValue: target,
      duration: EMPTY_AMBIENT_SUPPRESS_FADE_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    void AccessibilityInfo.isReduceMotionEnabled().then((rm) => {
      if (cancelled) {
        return;
      }
      if (rm) {
        emptyAmbientOpacity.setValue(target);
        return;
      }
      timing.start();
    });
    return () => {
      cancelled = true;
      timing.stop();
    };
  }, [streamEmptyAmbient, streamEmptyAmbientSuppressed, emptyAmbientOpacity]);

  const groups = useMemo(() => groupEntriesByDate(entries), [entries]);
  const newestShownId = groups[0]?.items[0]?.id ?? null;
  if (!visible) {
    return null;
  }

  if (entries.length === 0) {
    if (emptyHint == null || emptyHint === '') {
      return null;
    }
    return (
      <View
        testID="recent-list"
        style={[
          styles.list,
          {
            paddingTop: t.spacing.lg,
            ...(streamEmptyAmbient
              ? {
                  flexGrow: 1,
                  minHeight: Math.max(232, Math.round(windowHeight * 0.33)),
                }
              : {}),
          },
        ]}
      >
        {streamEmptyAmbient ? (
          <Animated.View
            style={{ opacity: emptyAmbientOpacity }}
            pointerEvents={streamEmptyAmbientSuppressed ? 'none' : 'box-none'}
            accessibilityElementsHidden={streamEmptyAmbientSuppressed}
          >
            <View
              style={[
                styles.emptyStateColumn,
                {
                  paddingVertical: t.spacing.md,
                  marginTop: -t.spacing.md,
                },
              ]}
            >
              <View
                testID="recent-list-empty-ambient"
                style={styles.emptyAmbientCluster}
                pointerEvents="none"
                importantForAccessibility="no"
                accessibilityElementsHidden
              >
                <StreamFlowPanel
                  calm={false}
                  deferMotion={false}
                  typingAccent={false}
                  useAdaptiveChrome
                  linesOnly
                  linesOnlyDrawPacing="idle"
                />
              </View>
              <View style={[styles.emptyHintAnchor, { marginTop: t.spacing.md }]}>
                <StreamEmptyHint
                  emptyHint={emptyHint}
                  streamGutter={streamGutter}
                  bodyFontFamily={body.fontFamily}
                  bodyFontSize={body.fontSize}
                  bodyLineHeight={body.lineHeight}
                  color={colors.fgDim}
                  paddingTop={0}
                  entranceDelayMs={EMPTY_AMBIENT_BEFORE_COPY_MS}
                  textAlign="center"
                />
              </View>
            </View>
          </Animated.View>
        ) : (
          <StreamEmptyHint
            emptyHint={emptyHint}
            streamGutter={streamGutter}
            bodyFontFamily={body.fontFamily}
            bodyFontSize={body.fontSize}
            bodyLineHeight={body.lineHeight}
            color={colors.fgDim}
            paddingTop={t.spacing.xs}
            entranceDelayMs={0}
          />
        )}
      </View>
    );
  }

  return (
    <View testID="recent-list" style={[styles.list, { paddingTop: t.spacing.lg }]}>
      {groups.map((section, sIndex) => (
        <View
          key={section.label + String(sIndex)}
          style={[
            styles.section,
            sIndex > 0 && { marginTop: t.spacing.sm },
          ]}
        >
          <Text
            accessibilityRole="header"
            style={[
              styles.sectionLabel,
              {
                paddingHorizontal: streamGutter,
                color: colors.sectionFg,
                fontFamily: meta.fontFamily,
                fontSize: meta.fontSize,
                lineHeight: 18,
                letterSpacing: 0.22,
                marginBottom: 6,
              },
            ]}
          >
            {section.label}
          </Text>
          {section.items.map((item, index) => {
            const isLastInSection = index === section.items.length - 1;
            return (
              <RecentStreamRow
                key={item.id}
                item={item}
                isLastInSection={isLastInSection}
                isNewest={item.id === newestShownId}
                streamGutter={streamGutter}
                onEntryPress={onEntryPress}
                onEntryDelete={onEntryDelete}
              />
            );
          })}
        </View>
      ))}
      {listFooterHint != null && listFooterHint !== '' ? (
        <Text
          testID="recent-list-footer-hint"
          accessibilityRole="text"
          style={[
            styles.footerHint,
            {
              paddingHorizontal: streamGutter,
              color: colors.muted,
              fontFamily: meta.fontFamily,
              fontSize: 12,
              lineHeight: 17,
              letterSpacing: 0.15,
              marginTop: t.spacing.md,
            },
          ]}
        >
          {listFooterHint}
        </Text>
      ) : null}
    </View>
  );
}

export const RecentList = memo(RecentListInner);

const styles = StyleSheet.create({
  list: {
    width: '100%',
  },
  emptyHint: {
    paddingBottom: 8,
  },
  emptyHintCentered: {
    alignSelf: 'center',
    maxWidth: 340,
    width: '100%',
  },
  /** Lines + copy as one vertically centered unit in the stream well. */
  emptyStateColumn: {
    alignSelf: 'stretch',
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyAmbientCluster: {
    alignItems: 'center',
    alignSelf: 'center',
  },
  emptyHintAnchor: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  footerHint: {
    paddingVertical: 2,
  },
  section: {
    width: '100%',
  },
  sectionLabel: {},
  rowOuter: {
    width: '100%',
  },
  rowOuterRelative: {
    position: 'relative',
  },
  pressableAboveTrace: {
    width: '100%',
    alignSelf: 'stretch',
    zIndex: 2,
    borderRadius: 0,
  },
  /** Full width of the stream row (rowOuter), not the padded text inset. */
  streamRowPressShade: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    borderRadius: 0,
  },
  /**
   * Vertical rhythm only; horizontal inset lives on entryRow so press tint can span the full row.
   */
  entryBlock: {
    width: '100%',
    paddingVertical: 15,
  },
  entryRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  line: {},
  time: {
    marginTop: 2,
  },
  deleteTrack: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteLabel: {
    fontSize: 13,
    letterSpacing: 0.2,
    opacity: 0.92,
  },
});
