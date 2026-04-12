import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  type LayoutChangeEvent,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import type { Entry } from '../types/entry';
import {
  chinottoHeadlineTextGradient,
  fonts,
  screenContentGutter,
  screenContentInnerPad,
  useAppTheme,
} from '../theme';
import { replaceHttpUrlsWithCompactDisplay } from '../utils/extractHttpUrlsFromText';
import {
  buildStreamListModel,
  formatEntryTime,
  formatPinnedEntryTemporal,
} from '../utils/groupEntriesByDate';
import { chronologicallyNewestEntryId } from '../utils/streamEntryOrder';
import {
  findActiveFlatIndex,
  findActiveFlatIndexFromWindowMeasurements,
  streamFocusBodyOpacityBelowActive,
  streamFocusTimeOpacityBelowActive,
  type StreamFocusWindowBox,
} from '../utils/streamFocusTier';
import { StreamFlowPanel } from './StreamFlowPanel';

/**
 * Stream — first **pinned** thought inline; optional **+N** before time opens overlay for the rest.
 * Date sections for unpinned only. Row hairlines like desktop `.entry-row`.
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
  /**
   * Long-press on a thought (e.g. Pin / Unpin). Primary tap stays onEntryPress.
   * Omit in screenshot / deterministic scenes where action sheets are unwanted.
   */
  onEntryLongPress?: (entry: Entry) => void;
  onEntryDelete?: (entry: Entry) => void;
  /** Row id for a brief leading-edge trace (e.g. just saved from capture or share). */
  highlightEntryId?: string | null;
  /**
   * When true and the stream is empty, show slow line art (`StreamFlowPanel` linesOnly)
   * (`StreamFlowPanel`) above the hint — not for search-miss empty.
   */
  streamEmptyAmbient?: boolean;
  /**
   * When true, fade the empty stream illustration + copy (composer has text or voice is active).
   */
  streamEmptyAmbientSuppressed?: boolean;
  /**
   * When true, hold line-draw and empty-hint entrance until visible (e.g. full-screen splash over capture).
   */
  deferEmptyStreamMotion?: boolean;
  /** Scroll content offset Y — only used to pick which row is “active” (top visible); styling is index-based. */
  streamScrollY?: number;
  /** Measured scroll viewport height — do not substitute window height; used only for active-row detection. */
  streamViewportHeight?: number;
  /** When true, emphasis follows the active row (moving focus); opacity is distance-from-active, not screen Y. */
  streamViewportFocusEnabled?: boolean;
  /**
   * When set, the active row is chosen with `measureInWindow` on this scroll view vs each row
   * (true on-screen visibility). Falls back to scroll-space geometry when unset (e.g. tests).
   */
  streamScrollViewRef?: RefObject<View | null>;
};

const DELETE_ACTION_WIDTH = 76;
/** Same threshold as stream rows — pin/unpin sheet. */
const STREAM_ROW_LONG_PRESS_MS = 380;

function measureInWindowPromise(view: View | null): Promise<StreamFocusWindowBox | null> {
  if (!view) return Promise.resolve(null);
  return new Promise((resolve) => {
    view.measureInWindow((x, y, w, h) => {
      resolve({ x, y, width: w, height: h });
    });
  });
}

/** Parent should clear `highlightEntryId` after this (full fade + small buffer). */
export const STREAM_HIGHLIGHT_CLEAR_AFTER_MS = 0;

/** Staged empty-hint entrance — fade + slight lift. */
const EMPTY_HINT_ENTRANCE_MS = 1100;
const EMPTY_HINT_STAGGER_MS = 280;
const EMPTY_HINT_Y_OFFSET = 7;
const EMPTY_HINT_EASING = Easing.out(Easing.cubic);
/** Let stream illustration lead through first beats before copy fades in. */
const EMPTY_AMBIENT_BEFORE_COPY_MS = 1150;
const EMPTY_AMBIENT_SUPPRESS_FADE_MS = 340;

/** Empty-stream headline — step up from body; pairs with desktop `.stream-empty-title` gradient. */
const EMPTY_STREAM_HEADLINE_FONT_SIZE = 19;
const EMPTY_STREAM_HEADLINE_LINE_HEIGHT = 27;
const EMPTY_STREAM_HEADLINE_LETTER_SPACING = -0.38;

/** Cross-fade when viewport highlight moves (ms); 0 when reduce-motion. */
const STREAM_FOCUS_OPACITY_DURATION_MS = 200;

/** Pressed stream row — full-bleed tint, softer than a card fill. */
function entryPressedBackground(isDark: boolean): string {
  return isDark ? 'rgba(128, 138, 188, 0.085)' : 'rgba(100, 110, 180, 0.072)';
}

function streamFocusBodyTargetOpacity(
  viewportFocus: boolean,
  streamFocusDelta: number | undefined,
  showNewest: boolean,
  sunlightMode: boolean,
  reduceMotion: boolean,
): number {
  if (!viewportFocus) {
    return sunlightMode ? 1 : showNewest ? 1 : 0.84;
  }
  if (streamFocusDelta == null) {
    return sunlightMode ? 1 : showNewest ? 1 : 0.84;
  }
  if (streamFocusDelta < 0) {
    return sunlightMode ? 1 : 0.84;
  }
  if (streamFocusDelta === 0) {
    return 1;
  }
  return streamFocusBodyOpacityBelowActive(streamFocusDelta, sunlightMode, reduceMotion);
}

function streamFocusTimeTargetOpacity(
  viewportFocus: boolean,
  streamFocusDelta: number | undefined,
  reduceMotion: boolean,
): number {
  if (!viewportFocus || streamFocusDelta == null || streamFocusDelta < 1) {
    return 1;
  }
  return streamFocusTimeOpacityBelowActive(streamFocusDelta, reduceMotion);
}

type StreamRowProps = {
  item: Entry;
  isLastInSection: boolean;
  isNewest: boolean;
  /** Viewport highlight: flatIndex - activeIndex (opacity); typography stays `isNewest`-driven. */
  streamFocusDelta?: number;
  streamFocusReduceMotion?: boolean;
  /** Matches `CaptureScreen` scroll `paddingHorizontal` so rows can full-bleed under press/trace. */
  streamGutter: number;
  onEntryPress?: (entry: Entry) => void;
  onEntryLongPress?: (entry: Entry) => void;
  onEntryDelete?: (entry: Entry) => void;
  /** Pinned lead: show section-aligned date + time in the metadata column. */
  useTemporalContext?: boolean;
  /** Inline "+N" before time — opens overlay; only used with pinned preview row. */
  inlinePinnedMoreCount?: number;
  onPinnedMorePress?: () => void;
};

const RecentStreamRow = memo(function RecentStreamRowInner({
  item,
  isLastInSection,
  isNewest,
  streamFocusDelta,
  streamFocusReduceMotion = false,
  streamGutter,
  onEntryPress,
  onEntryLongPress,
  onEntryDelete,
  useTemporalContext = false,
  inlinePinnedMoreCount,
  onPinnedMorePress,
}: StreamRowProps) {
  const [pressed, setPressed] = useState(false);
  const t = useAppTheme();
  const { colors, typography, isDark } = t;
  const { body } = typography;
  const lineDisplay = replaceHttpUrlsWithCompactDisplay(item.text);
  const temporalLabel = useTemporalContext ? formatPinnedEntryTemporal(item.createdAt, new Date()) : null;
  const viewportFocus = streamFocusDelta !== undefined;
  /** List order only: first / newest stays the large type; scroll only changes opacity (highlight). */
  const showNewest = isNewest;

  const targetBodyOpacity = useMemo(
    () =>
      streamFocusBodyTargetOpacity(
        viewportFocus,
        streamFocusDelta,
        showNewest,
        t.sunlightMode,
        streamFocusReduceMotion,
      ),
    [viewportFocus, streamFocusDelta, showNewest, t.sunlightMode, streamFocusReduceMotion],
  );
  const targetTimeOpacity = useMemo(
    () => streamFocusTimeTargetOpacity(viewportFocus, streamFocusDelta, streamFocusReduceMotion),
    [viewportFocus, streamFocusDelta, streamFocusReduceMotion],
  );

  const bodyOpacityAnim = useRef<Animated.Value | null>(null);
  const timeOpacityAnim = useRef<Animated.Value | null>(null);
  if (bodyOpacityAnim.current == null) {
    bodyOpacityAnim.current = new Animated.Value(targetBodyOpacity);
  }
  if (timeOpacityAnim.current == null) {
    timeOpacityAnim.current = new Animated.Value(targetTimeOpacity);
  }

  useEffect(() => {
    const duration = streamFocusReduceMotion ? 0 : STREAM_FOCUS_OPACITY_DURATION_MS;
    const easing = Easing.out(Easing.cubic);
    const anim = Animated.parallel([
      Animated.timing(bodyOpacityAnim.current!, {
        toValue: targetBodyOpacity,
        duration,
        easing,
        useNativeDriver: true,
      }),
      Animated.timing(timeOpacityAnim.current!, {
        toValue: targetTimeOpacity,
        duration,
        easing,
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [targetBodyOpacity, targetTimeOpacity, streamFocusReduceMotion]);

  const onPressIn = useCallback(() => {
    setPressed(true);
  }, []);
  const onPressOut = useCallback(() => {
    setPressed(false);
  }, []);

  const pinned = item.pinned === true;

  const a11yHint =
    [
      onEntryPress != null ? 'Double tap to read full text' : null,
      onEntryLongPress != null ? 'Long press to pin or unpin' : null,
      onEntryDelete != null ? 'Swipe left to delete' : null,
    ]
      .filter(Boolean)
      .join('. ') || undefined;

  const entryPressableProps = {
    onPress: onEntryPress != null ? () => onEntryPress(item) : undefined,
    onLongPress: onEntryLongPress != null ? () => onEntryLongPress(item) : undefined,
    delayLongPress: STREAM_ROW_LONG_PRESS_MS,
    onPressIn,
    onPressOut,
    delayPressIn: 0,
    ...(Platform.OS === 'android' ? { android_ripple: null } : {}),
  };

  const rowPad = { paddingHorizontal: streamGutter + screenContentInnerPad };

  const hasInlinePinnedMore =
    inlinePinnedMoreCount != null && inlinePinnedMoreCount > 0 && onPinnedMorePress != null;

  const bodyText = (
    <Animated.Text
      style={[
        styles.line,
        {
          flex: 1,
          color: t.sunlightMode
            ? showNewest || (viewportFocus && streamFocusDelta === 0)
              ? colors.entryBody
              : colors.fgDim
            : colors.entryBody,
          fontFamily: showNewest ? fonts.medium : body.fontFamily,
          fontSize: showNewest ? 17 : body.fontSize,
          lineHeight: showNewest ? 26 : body.lineHeight,
          letterSpacing: showNewest ? 0.17 : 0.16,
          marginRight: hasInlinePinnedMore ? 4 : t.spacing.sm,
          opacity: bodyOpacityAnim.current!,
        },
      ]}
      numberOfLines={4}
    >
      {lineDisplay}
    </Animated.Text>
  );

  const timeText = (
    <Animated.Text
      style={[
        !useTemporalContext ? styles.time : null,
        useTemporalContext && styles.timeTemporal,
        {
          color: colors.muted,
          fontFamily: t.sunlightMode ? fonts.medium : fonts.regular,
          fontSize: useTemporalContext ? 10 : 11,
          lineHeight: useTemporalContext ? 14 : 15,
          opacity: timeOpacityAnim.current!,
          maxWidth: useTemporalContext && !hasInlinePinnedMore ? '44%' : undefined,
        },
      ]}
      numberOfLines={useTemporalContext ? 2 : 1}
    >
      {useTemporalContext ? temporalLabel : formatEntryTime(item.createdAt)}
    </Animated.Text>
  );

  const entryRowInner = hasInlinePinnedMore ? (
    <View style={[styles.entryRow, useTemporalContext && styles.entryRowAlignCenter, rowPad]}>
      <Pressable
        testID={`recent-entry-${item.id}`}
        accessible
        accessibilityLabel={`${item.text}, ${temporalLabel ?? formatEntryTime(item.createdAt)}${pinned ? ', pinned' : ''}`}
        accessibilityHint={a11yHint}
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
        {...entryPressableProps}
        style={[styles.pinnedRowBodyHit, { minWidth: 0 }]}
      >
        {bodyText}
      </Pressable>
      <Pressable
        testID="recent-list-pinned-more"
        accessibilityRole="button"
        accessibilityLabel={`Plus ${inlinePinnedMoreCount} pinned`}
        accessibilityHint="Opens list of pinned thoughts"
        onPress={onPinnedMorePress}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 2 }}
        style={styles.pinnedMoreInlineHit}
        {...(Platform.OS === 'android' ? { android_ripple: null } : {})}
      >
        <Text
          style={{
            color: colors.accent,
            fontFamily: fonts.medium,
            fontSize: 15,
            lineHeight: useTemporalContext ? 22 : 20,
            letterSpacing: 0.25,
          }}
        >
          +{inlinePinnedMoreCount}
        </Text>
      </Pressable>
      <Pressable
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        {...entryPressableProps}
        style={styles.pinnedRowTimeHitWithGap}
      >
        {timeText}
      </Pressable>
    </View>
  ) : (
    <View style={[styles.entryRow, useTemporalContext && styles.entryRowAlignCenter, rowPad]}>
      {bodyText}
      {timeText}
    </View>
  );

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
      {hasInlinePinnedMore ? (
        <View style={styles.pressableAboveTrace} accessible={false}>
          <View style={styles.entryBlock}>{entryRowInner}</View>
        </View>
      ) : (
        <Pressable
          accessible
          accessibilityLabel={`${item.text}, ${temporalLabel ?? formatEntryTime(item.createdAt)}${pinned ? ', pinned' : ''}`}
          accessibilityHint={a11yHint}
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
          {...entryPressableProps}
          style={styles.pressableAboveTrace}
        >
          <View style={styles.entryBlock}>{entryRowInner}</View>
        </Pressable>
      )}
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
});

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

function GradientHeadlineLine({
  text,
  textAlign,
  entrance,
}: {
  text: string;
  textAlign: 'left' | 'center';
  entrance: Animated.Value;
}) {
  const headlineTextStyle = useMemo(
    () => ({
      fontFamily: fonts.medium,
      fontSize: EMPTY_STREAM_HEADLINE_FONT_SIZE,
      lineHeight: EMPTY_STREAM_HEADLINE_LINE_HEIGHT,
      letterSpacing: EMPTY_STREAM_HEADLINE_LETTER_SPACING,
      textAlign,
    }),
    [textAlign]
  );
  const g = chinottoHeadlineTextGradient;
  return (
    <Animated.View style={streamEmptyHintEntranceStyle(entrance)}>
      <MaskedView
        style={textAlign === 'center' ? { alignSelf: 'center' } : { alignSelf: 'flex-start' }}
        maskElement={<Text style={[headlineTextStyle, { color: '#000000' }]}>{text}</Text>}
      >
        <LinearGradient
          colors={[...g.colors]}
          locations={[...g.locations]}
          start={g.start}
          end={g.end}
        >
          <Text style={[headlineTextStyle, { opacity: 0 }]}>{text}</Text>
        </LinearGradient>
      </MaskedView>
    </Animated.View>
  );
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
  /** When true, keep lines invisible until false (sync with empty-stream line art `deferMotion`). */
  deferEntrance?: boolean;
  /** When set, use desktop-aligned headline gradient (empty capture stream + ambient art only). */
  headlineGradient?: boolean;
  /** Solid color when `headlineGradient` and reduce motion. */
  headlineFlatColor?: string;
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
  deferEntrance = false,
  headlineGradient = false,
  headlineFlatColor,
}: StreamEmptyHintProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
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
  const headlineTextStyle = useMemo(
    () => ({
      fontFamily: fonts.medium,
      fontSize: EMPTY_STREAM_HEADLINE_FONT_SIZE,
      lineHeight: EMPTY_STREAM_HEADLINE_LINE_HEIGHT,
      letterSpacing: EMPTY_STREAM_HEADLINE_LETTER_SPACING,
      textAlign,
    }),
    [textAlign]
  );

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (deferEntrance) {
      line0.setValue(0);
      line1.setValue(0);
      return () => {
        line0.stopAnimation();
        line1.stopAnimation();
      };
    }
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
  }, [deferEntrance, emptyHint, twoLines, entranceDelayMs, line0, line1]);

  const flatHeadlineColor = headlineFlatColor ?? color;

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
      {headlineGradient && !reduceMotion ? (
        <>
          <GradientHeadlineLine text={lines[0] ?? emptyHint} textAlign={textAlign} entrance={line0} />
          {twoLines ? <GradientHeadlineLine text={lines[1]} textAlign={textAlign} entrance={line1} /> : null}
        </>
      ) : headlineGradient && reduceMotion ? (
        <>
          <Animated.Text
            style={[headlineTextStyle, { color: flatHeadlineColor }, streamEmptyHintEntranceStyle(line0)]}
            importantForAccessibility="no"
          >
            {lines[0] ?? emptyHint}
          </Animated.Text>
          {twoLines ? (
            <Animated.Text
              style={[headlineTextStyle, { color: flatHeadlineColor }, streamEmptyHintEntranceStyle(line1)]}
              importantForAccessibility="no"
            >
              {lines[1]}
            </Animated.Text>
          ) : null}
        </>
      ) : (
        <>
          <Animated.Text style={[textStyle, streamEmptyHintEntranceStyle(line0)]} importantForAccessibility="no">
            {lines[0] ?? emptyHint}
          </Animated.Text>
          {twoLines ? (
            <Animated.Text style={[textStyle, streamEmptyHintEntranceStyle(line1)]} importantForAccessibility="no">
              {lines[1]}
            </Animated.Text>
          ) : null}
        </>
      )}
    </View>
  );
}

function RecentListInner({
  entries,
  visible,
  emptyHint,
  listFooterHint,
  onEntryPress,
  onEntryLongPress,
  onEntryDelete,
  highlightEntryId = null,
  streamEmptyAmbient = false,
  streamEmptyAmbientSuppressed = false,
  deferEmptyStreamMotion = false,
  streamScrollY = 0,
  streamViewportHeight = 0,
  streamViewportFocusEnabled = false,
  streamScrollViewRef,
}: RecentListProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const streamGutter = screenContentGutter(windowWidth);
  const t = useAppTheme();
  const { colors, typography } = t;
  const { body, meta } = typography;
  const emptyAmbientOpacity = useRef(new Animated.Value(1)).current;
  const [listOffsetY, setListOffsetY] = useState(0);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [windowActiveIndex, setWindowActiveIndex] = useState(-1);
  const [reduceMotion, setReduceMotion] = useState(false);
  const framesRef = useRef<Map<string, { top: number; height: number }>>(new Map());
  const rowRefs = useRef<Map<string, View | null>>(new Map());
  const setRowRef = useCallback((id: string) => {
    return (node: View | null) => {
      if (node) {
        rowRefs.current.set(id, node);
      } else {
        rowRefs.current.delete(id);
      }
    };
  }, []);
  /** Matches list root `paddingTop` — row `onLayout` `y` is measured below this inset. */
  const listPaddingTop = t.spacing.lg;

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

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

  const { pinnedLead, dayGroups } = useMemo(() => buildStreamListModel(entries), [entries]);
  const mainStreamEntries = useMemo(() => dayGroups.flatMap((g) => g.items), [dayGroups]);
  /** Newest-first among pinned (see `sortEntriesStreamOrder`); same as desktop stream lead. */
  const pinnedPreview = pinnedLead[0] ?? null;
  const pinnedMoreCount = pinnedLead.length > 1 ? pinnedLead.length - 1 : 0;
  const entriesForLeadEmphasis = useMemo(() => {
    return pinnedPreview != null ? [pinnedPreview, ...mainStreamEntries] : mainStreamEntries;
  }, [pinnedPreview, mainStreamEntries]);
  const newestShownId = useMemo(
    () => chronologicallyNewestEntryId(entriesForLeadEmphasis),
    [entriesForLeadEmphasis],
  );
  const orderedIds = useMemo(() => mainStreamEntries.map((e) => e.id), [mainStreamEntries]);
  const [pinnedOverlayOpen, setPinnedOverlayOpen] = useState(false);
  /** Modal is a separate layer — real backdrop blur cannot see the stream; a soft gradient reads calmer than a flat slab. */
  const pinnedModalGradientColors = useMemo(
    () =>
      t.isDark
        ? ['rgba(42, 44, 54, 0.52)', 'rgba(24, 25, 30, 0.9)', 'rgba(12, 12, 15, 0.94)']
        : ['rgba(255, 255, 255, 0.97)', 'rgba(246, 247, 251, 0.99)', 'rgba(236, 238, 245, 0.99)'],
    [t.isDark],
  );
  /** Day headers + unpinned rows only (pinned are not in this list). */
  const flatItems = useMemo(() => {
    const out: Array<
      | { kind: 'header'; label: string; sectionIndex: number; key: string }
      | { kind: 'entry'; entry: Entry; flatIndex: number; key: string }
    > = [];
    let globalFlatIndex = 0;
    for (let s = 0; s < dayGroups.length; s++) {
      const section = dayGroups[s];
      out.push({
        kind: 'header',
        label: section.label,
        sectionIndex: s,
        key: `h-${section.label}-${s}`,
      });
      for (const row of section.items) {
        out.push({
          kind: 'entry',
          entry: row,
          flatIndex: globalFlatIndex,
          key: row.id,
        });
        globalFlatIndex += 1;
      }
    }
    return out;
  }, [dayGroups]);

  useLayoutEffect(() => {
    if (!streamViewportFocusEnabled) {
      return;
    }
    const ids = new Set(orderedIds);
    for (const key of [...framesRef.current.keys()]) {
      if (!ids.has(key)) {
        framesRef.current.delete(key);
      }
    }
    setLayoutVersion((v) => v + 1);
  }, [orderedIds, streamViewportFocusEnabled]);

  const onListLayout = useCallback(
    (e: LayoutChangeEvent) => {
      if (!streamViewportFocusEnabled) {
        return;
      }
      setListOffsetY(e.nativeEvent.layout.y);
    },
    [streamViewportFocusEnabled],
  );

  const onEntryRowLayout = useCallback(
    (id: string) => {
      return (e: LayoutChangeEvent) => {
        if (!streamViewportFocusEnabled) {
          return;
        }
        const { y, height } = e.nativeEvent.layout;
        framesRef.current.set(id, { top: y, height });
        setLayoutVersion((v) => v + 1);
      };
    },
    [streamViewportFocusEnabled],
  );

  const geometryActiveIndex = useMemo(() => {
    if (!streamViewportFocusEnabled) {
      return -1;
    }
    const viewportH =
      streamViewportHeight > 0 ? streamViewportHeight : Math.max(1, Math.round(windowHeight * 0.55));
    return findActiveFlatIndex(
      orderedIds,
      framesRef.current,
      streamScrollY,
      viewportH,
      listOffsetY,
      listPaddingTop,
    );
  }, [
    streamViewportFocusEnabled,
    streamScrollY,
    streamViewportHeight,
    listOffsetY,
    listPaddingTop,
    layoutVersion,
    orderedIds,
    windowHeight,
  ]);

  useLayoutEffect(() => {
    if (!streamViewportFocusEnabled || streamScrollViewRef == null) {
      return;
    }
    if (streamScrollViewRef.current == null) {
      setWindowActiveIndex(-1);
      return;
    }
    let cancelled = false;
    void (async () => {
      const sv = streamScrollViewRef.current;
      if (!sv) {
        return;
      }
      const scrollBox = await measureInWindowPromise(sv);
      if (!scrollBox || cancelled) {
        return;
      }
      const measurements = await Promise.all(
        orderedIds.map(async (id, i) => ({
          flatIndex: i,
          box: await measureInWindowPromise(rowRefs.current.get(id) ?? null),
        })),
      );
      if (cancelled) {
        return;
      }
      const idx = findActiveFlatIndexFromWindowMeasurements(scrollBox, measurements);
      setWindowActiveIndex(idx);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    streamViewportFocusEnabled,
    streamScrollViewRef,
    streamScrollY,
    streamViewportHeight,
    layoutVersion,
    orderedIds,
  ]);

  const activeFlatIndex =
    streamScrollViewRef != null && windowActiveIndex >= 0 ? windowActiveIndex : geometryActiveIndex;

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
                  deferMotion={deferEmptyStreamMotion}
                  typingAccent={false}
                  useAdaptiveChrome
                  linesOnly
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
                  deferEntrance={deferEmptyStreamMotion}
                  headlineGradient
                  headlineFlatColor={colors.fg}
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
            deferEntrance={deferEmptyStreamMotion}
          />
        )}
      </View>
    );
  }

  return (
    <View
      testID="recent-list"
      style={[styles.list, { paddingTop: listPaddingTop }]}
      onLayout={streamViewportFocusEnabled ? onListLayout : undefined}
    >
      {pinnedPreview != null ? (
        <View
          style={[
            styles.pinnedInlineWrap,
            {
              paddingTop: t.spacing.sm + 4,
              paddingBottom: t.spacing.sm + 2,
            },
          ]}
        >
          <View style={styles.rowMeasureWrap}>
            <RecentStreamRow
              item={pinnedPreview}
              isLastInSection
              isNewest={pinnedPreview.id === newestShownId}
              streamGutter={streamGutter}
              onEntryPress={onEntryPress}
              onEntryLongPress={onEntryLongPress}
              onEntryDelete={onEntryDelete}
              useTemporalContext
              inlinePinnedMoreCount={pinnedMoreCount > 0 ? pinnedMoreCount : undefined}
              onPinnedMorePress={pinnedMoreCount > 0 ? () => setPinnedOverlayOpen(true) : undefined}
            />
          </View>
        </View>
      ) : null}
      {flatItems.map((item, index) => {
        if (item.kind === 'header') {
          return (
            <View
              key={item.key}
              style={
                item.sectionIndex > 0
                  ? { marginTop: t.spacing.sm }
                  : item.sectionIndex === 0 && pinnedPreview != null
                    ? { marginTop: t.spacing.md + 6 }
                    : undefined
              }
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
                {item.label}
              </Text>
            </View>
          );
        }
        const isLastInSection =
          flatItems[index + 1]?.kind === 'header' || flatItems[index + 1] == null;
        const streamFocusDelta =
          streamViewportFocusEnabled && activeFlatIndex >= 0
            ? item.flatIndex - activeFlatIndex
            : undefined;
        return (
          <View
            key={item.key}
            ref={streamViewportFocusEnabled && streamScrollViewRef != null ? setRowRef(item.entry.id) : undefined}
            style={styles.rowMeasureWrap}
            collapsable={Platform.OS === 'android' ? false : undefined}
            onLayout={streamViewportFocusEnabled ? onEntryRowLayout(item.entry.id) : undefined}
          >
            <RecentStreamRow
              item={item.entry}
              isLastInSection={isLastInSection}
              isNewest={item.entry.id === newestShownId}
              streamFocusDelta={streamFocusDelta}
              streamFocusReduceMotion={reduceMotion}
              streamGutter={streamGutter}
              onEntryPress={onEntryPress}
              onEntryLongPress={onEntryLongPress}
              onEntryDelete={onEntryDelete}
            />
          </View>
        );
      })}
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
      <Modal
        visible={pinnedOverlayOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPinnedOverlayOpen(false)}
      >
        <View style={styles.pinnedModalRoot}>
          <Pressable
            style={[StyleSheet.absoluteFillObject, styles.pinnedModalBackdrop]}
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => setPinnedOverlayOpen(false)}
          />
          <View
            style={[
              styles.pinnedModalSheet,
              {
                maxHeight: Math.round(windowHeight * 0.72),
                borderColor: t.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
                ...Platform.select({
                  ios: {
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.18,
                    shadowRadius: 22,
                  },
                  android: { elevation: 10 },
                  default: {},
                }),
              },
            ]}
          >
            <LinearGradient
              colors={pinnedModalGradientColors}
              locations={[0, 0.45, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <ScrollView
              style={styles.pinnedModalScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.pinnedModalScrollContent}
            >
              {pinnedLead.map((entry, idx) => {
                const line = replaceHttpUrlsWithCompactDisplay(entry.text);
                const when = formatPinnedEntryTemporal(entry.createdAt);
                const modalRowA11yHint =
                  [
                    onEntryPress != null ? 'Double tap to read full text' : null,
                    onEntryLongPress != null ? 'Long press to pin or unpin' : null,
                  ]
                    .filter(Boolean)
                    .join('. ') || undefined;
                return (
                  <Pressable
                    key={entry.id}
                    testID={`recent-list-pinned-overlay-${entry.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${entry.text}, ${when}`}
                    accessibilityHint={modalRowA11yHint}
                    onPress={() => {
                      onEntryPress?.(entry);
                      setPinnedOverlayOpen(false);
                    }}
                    onLongPress={onEntryLongPress != null ? () => onEntryLongPress(entry) : undefined}
                    delayLongPress={STREAM_ROW_LONG_PRESS_MS}
                    delayPressIn={0}
                    style={[
                      styles.pinnedModalRow,
                      idx > 0 && {
                        borderTopWidth: StyleSheet.hairlineWidth,
                        borderTopColor: t.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                      },
                    ]}
                    {...(Platform.OS === 'android' ? { android_ripple: null } : {})}
                  >
                    <Text
                      style={{
                        color: colors.entryBody,
                        fontFamily: fonts.regular,
                        fontSize: 15,
                        lineHeight: 22,
                      }}
                      numberOfLines={4}
                    >
                      {line}
                    </Text>
                    <Text
                      style={{
                        marginTop: 4,
                        color: colors.muted,
                        fontFamily: meta.fontFamily,
                        fontSize: 11,
                        lineHeight: 15,
                      }}
                    >
                      {when}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  /** Wraps each stream row for layout Y relative to the list root (viewport focus). */
  rowMeasureWrap: {
    width: '100%',
  },
  sectionLabel: {},
  pinnedInlineWrap: {
    width: '100%',
    alignSelf: 'stretch',
  },
  /** Pinned preview uses two-line temporal on the right — center with body for balance. */
  entryRowAlignCenter: {
    alignItems: 'center',
  },
  pinnedRowBodyHit: {
    flex: 1,
  },
  pinnedMoreInlineHit: {
    flexShrink: 0,
    justifyContent: 'center',
    alignSelf: 'center',
    marginRight: 10,
  },
  pinnedRowTimeHitWithGap: {
    flexShrink: 0,
    justifyContent: 'center',
    alignSelf: 'center',
    paddingLeft: 8,
    marginLeft: 2,
  },
  pinnedModalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinnedModalBackdrop: {
    backgroundColor: 'rgba(0,0,0,0.36)',
  },
  pinnedModalSheet: {
    width: '88%',
    maxWidth: 400,
    borderRadius: 22,
    overflow: 'hidden',
    zIndex: 1,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pinnedModalScroll: {
    backgroundColor: 'transparent',
    zIndex: 2,
  },
  pinnedModalScrollContent: {
    paddingVertical: 4,
    paddingBottom: 20,
  },
  pinnedModalRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
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
  timeTemporal: {
    textAlign: 'right',
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
