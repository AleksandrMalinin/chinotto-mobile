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
  InteractionManager,
  type LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import Swipeable, { type Swipeable as SwipeableRef } from 'react-native-gesture-handler/Swipeable';

import type { Entry } from '../types/entry';
import {
  chinottoHeadlineTextGradient,
  fonts,
  screenContentGutter,
  screenContentInnerPad,
  useAppTheme,
} from '../theme';
import { replaceHttpUrlsWithCompactDisplay } from '../utils/extractHttpUrlsFromText';
import { formatEntryTime, groupEntriesByDate } from '../utils/groupEntriesByDate';
import { splitTextBySearchQuery } from '../utils/splitTextBySearchQuery';
import {
  findActiveFlatIndex,
  findActiveFlatIndexFromWindowMeasurements,
  streamFocusBodyOpacityBelowActive,
  streamFocusTimeOpacityBelowActive,
  type StreamFocusWindowBox,
} from '../utils/streamFocusTier';
import {
  STREAM_FOCUS_OPACITY_DURATION_MS,
  STREAM_ROW_PRESS_IN_MS,
  STREAM_ROW_PRESS_OUT_MS,
} from '../constants/streamFocus';
import { confirmDeleteThought } from '../utils/confirmDeleteThought';
import { streamScrollContentYForRow } from '../utils/streamScrollToEntry';
import { StreamFlowPanel } from './StreamFlowPanel';
import type { ThoughtSheetOpenAnchor } from './thoughtSheet/detents';

/**
 * Time-grouped stream — section labels (`.stream-section-title`), entry rows with
 * hairline separators like desktop `.entry-row` / `var(--border)`, plus inline time.
 * Each row shows **two lines** of body text (ellipsis); full text opens via `onEntryPress`.
 *
 * Delete: **swipe left** to reveal delete, then tap Delete (capture screen confirms) — intentional gesture only;
 * local-first + tombstone queue (see `deleteEntry`).
 */
export type RecentListProps = {
  entries: Entry[];
  visible: boolean;
  /** Shown when `visible` and there are no rows (e.g. search had no hits). */
  emptyHint?: string;
  /** Muted line below the list (e.g. search capped at N results). */
  listFooterHint?: string;
  /** When set, highlights case-insensitive matches in entry preview lines. */
  searchHighlightQuery?: string;
  /** Opens full-text read sheet (companion recall). Optional anchor for row→sheet motion. */
  onEntryPress?: (entry: Entry, anchor?: ThoughtSheetOpenAnchor) => void;
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
  /** Top-visible stream row (viewport focus) — for temporal month scrubber. */
  onActiveStreamEntryChange?: (entry: Entry | null) => void;
  /** When set, report scroll content Y for this entry (temporal month jump). */
  scrollToEntryId?: string | null;
  /** Live scroll offset — prefer over `streamScrollY` prop inside async measure (temporal jump). */
  streamScrollYRef?: RefObject<number>;
  onScrollToEntryOffset?: (contentOffsetY: number) => void;
  onScrollToEntryComplete?: () => void;
};

const DELETE_ACTION_WIDTH = 76;

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
  searchHighlightQuery?: string;
  /** Matches `CaptureScreen` scroll `paddingHorizontal` so rows can full-bleed under press/trace. */
  streamGutter: number;
  onEntryPress?: (entry: Entry, anchor?: ThoughtSheetOpenAnchor) => void;
  onEntryDelete?: (entry: Entry) => void;
};

type EntryBodyPreviewProps = {
  lineDisplay: string;
  searchHighlightQuery?: string;
  bodyStyle: object;
  matchHighlightColor: string;
  numberOfLines: number;
  bodyOpacity: Animated.Value;
};

function EntryBodyPreview({
  lineDisplay,
  searchHighlightQuery,
  bodyStyle,
  matchHighlightColor,
  numberOfLines,
  bodyOpacity,
}: EntryBodyPreviewProps) {
  const segments = useMemo(
    () => splitTextBySearchQuery(lineDisplay, searchHighlightQuery ?? ''),
    [lineDisplay, searchHighlightQuery],
  );
  const highlightActive = (searchHighlightQuery?.trim().length ?? 0) > 0;

  return (
    <Animated.Text style={[bodyStyle, { opacity: bodyOpacity }]} numberOfLines={numberOfLines}>
      {highlightActive
        ? segments.map((segment, index) => (
            <Text
              key={`${index}-${segment.text.slice(0, 8)}`}
              style={
                segment.match
                  ? {
                      backgroundColor: matchHighlightColor,
                      fontFamily: fonts.medium,
                    }
                  : undefined
              }
            >
              {segment.text}
            </Text>
          ))
        : lineDisplay}
    </Animated.Text>
  );
}

const RecentStreamRow = memo(function RecentStreamRowInner({
  item,
  isLastInSection,
  isNewest,
  streamFocusDelta,
  streamFocusReduceMotion = false,
  searchHighlightQuery,
  streamGutter,
  onEntryPress,
  onEntryDelete,
}: StreamRowProps) {
  const pressShade = useRef(new Animated.Value(0)).current;
  const t = useAppTheme();
  const { colors, typography, isDark } = t;
  const { body } = typography;
  const lineDisplay = replaceHttpUrlsWithCompactDisplay(item.text);
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

  const rowRef = useRef<View>(null);
  const swipeableRef = useRef<SwipeableRef | null>(null);

  const requestEntryDelete = useCallback(() => {
    if (onEntryDelete == null) {
      return;
    }
    confirmDeleteThought(
      () => onEntryDelete(item),
      () => swipeableRef.current?.close(),
    );
  }, [item, onEntryDelete]);

  const onPressIn = useCallback(() => {
    Animated.timing(pressShade, {
      toValue: 1,
      duration: STREAM_ROW_PRESS_IN_MS,
      useNativeDriver: true,
    }).start();
  }, [pressShade]);
  const onPressOut = useCallback(() => {
    Animated.timing(pressShade, {
      toValue: 0,
      duration: STREAM_ROW_PRESS_OUT_MS,
      useNativeDriver: true,
    }).start();
  }, [pressShade]);

  const handlePress = useCallback(() => {
    onEntryPress?.(item, null);
  }, [item, onEntryPress]);

  const rowContent = (
    <View
      ref={rowRef}
      style={[
        styles.rowOuter,
        styles.rowOuterRelative,
        !isLastInSection && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.streamDivider,
        },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        importantForAccessibility="no"
        style={[
          styles.streamRowPressShade,
          {
            backgroundColor: entryPressedBackground(isDark),
            opacity: pressShade,
          },
        ]}
      />
      <Pressable
        accessible={true}
        accessibilityLabel={`${item.text}, ${formatEntryTime(item.createdAt)}`}
        accessibilityHint={
          [
            onEntryPress != null ? 'Double tap to open thought' : null,
            onEntryDelete != null ? 'Swipe left, then tap Delete' : null,
          ]
            .filter(Boolean)
            .join('. ') || undefined
        }
        accessibilityActions={onEntryDelete != null ? [{ name: 'delete', label: 'Delete' }] : undefined}
        onAccessibilityAction={
          onEntryDelete != null
            ? ({ nativeEvent }) => {
                if (nativeEvent.actionName === 'delete') {
                  requestEntryDelete();
                }
              }
            : undefined
        }
        testID={`recent-entry-${item.id}`}
        onPress={onEntryPress != null ? handlePress : undefined}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
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
            <EntryBodyPreview
              lineDisplay={lineDisplay}
              searchHighlightQuery={searchHighlightQuery}
              numberOfLines={2}
              bodyOpacity={bodyOpacityAnim.current!}
              matchHighlightColor={colors.accentSubtle}
              bodyStyle={[
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
                  marginRight: t.spacing.sm,
                },
              ]}
            />
            <Animated.Text
              style={[
                styles.time,
                {
                  color: colors.muted,
                  fontFamily: t.sunlightMode ? fonts.medium : fonts.regular,
                  fontSize: 11,
                  lineHeight: 15,
                  opacity: timeOpacityAnim.current!,
                },
              ]}
            >
              {formatEntryTime(item.createdAt)}
            </Animated.Text>
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
      ref={swipeableRef}
      friction={2}
      overshootRight={false}
      /** Full-width reveal before commit — reduces accidental delete vs horizontal chrome. */
      rightThreshold={DELETE_ACTION_WIDTH}
      renderRightActions={() => (
        <Pressable
          testID={`recent-entry-delete-${item.id}`}
          accessibilityRole="button"
          accessibilityLabel="Delete thought"
          onPress={requestEntryDelete}
          style={({ pressed }) => [
            styles.deleteTrack,
            {
              width: DELETE_ACTION_WIDTH,
              backgroundColor: colors.swipeDeleteBg,
              borderLeftWidth: StyleSheet.hairlineWidth,
              borderLeftColor: colors.borderFocus,
              opacity: pressed ? 0.88 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.deleteLabel,
              { fontFamily: fonts.medium, color: colors.fg },
            ]}
          >
            Delete
          </Text>
        </Pressable>
      )}
      onSwipeableOpen={requestEntryDelete}
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
  searchHighlightQuery,
  onEntryPress,
  onEntryDelete,
  highlightEntryId = null,
  streamEmptyAmbient = false,
  streamEmptyAmbientSuppressed = false,
  deferEmptyStreamMotion = false,
  streamScrollY = 0,
  streamViewportHeight = 0,
  streamViewportFocusEnabled = false,
  streamScrollViewRef,
  onActiveStreamEntryChange,
  scrollToEntryId = null,
  streamScrollYRef,
  onScrollToEntryOffset,
  onScrollToEntryComplete,
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

  const groups = useMemo(() => groupEntriesByDate(entries), [entries]);
  const newestShownId = groups[0]?.items[0]?.id ?? null;
  const orderedIds = useMemo(() => groups.flatMap((g) => g.items.map((e) => e.id)), [groups]);
  const flatItems = useMemo(() => {
    const out: Array<
      | { kind: 'header'; label: string; sectionIndex: number; key: string }
      | { kind: 'entry'; entry: Entry; flatIndex: number; key: string }
    > = [];
    let globalFlatIndex = 0;
    for (let s = 0; s < groups.length; s++) {
      const section = groups[s];
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
  }, [groups]);

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

  useEffect(() => {
    if (onActiveStreamEntryChange == null) {
      return;
    }
    if (activeFlatIndex < 0) {
      onActiveStreamEntryChange(null);
      return;
    }
    const id = orderedIds[activeFlatIndex];
    const entry = entries.find((e) => e.id === id) ?? null;
    onActiveStreamEntryChange(entry);
  }, [activeFlatIndex, orderedIds, entries, onActiveStreamEntryChange]);

  useEffect(() => {
    if (scrollToEntryId == null || onScrollToEntryOffset == null) {
      return;
    }
    if (!orderedIds.includes(scrollToEntryId)) {
      return;
    }
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 48;
    const scrollFromLayoutFrames = () => {
      const frame = framesRef.current.get(scrollToEntryId);
      if (frame == null) {
        return false;
      }
      onScrollToEntryOffset(listOffsetY + listPaddingTop + frame.top);
      return true;
    };
    const tryMeasure = async () => {
      if (cancelled) {
        return;
      }
      const row = rowRefs.current.get(scrollToEntryId);
      const sv = streamScrollViewRef?.current ?? null;
      if (row != null && sv != null) {
        const scrollBox = await measureInWindowPromise(sv);
        const rowBox = await measureInWindowPromise(row);
        if (!cancelled && scrollBox != null && rowBox != null) {
          const liveScrollY = streamScrollYRef?.current ?? streamScrollY;
          onScrollToEntryOffset(
            streamScrollContentYForRow(liveScrollY, scrollBox, rowBox),
          );
          onScrollToEntryComplete?.();
          return;
        }
      }
      if (scrollFromLayoutFrames()) {
        onScrollToEntryComplete?.();
        return;
      }
      attempts += 1;
      if (attempts < maxAttempts) {
        requestAnimationFrame(() => {
          void tryMeasure();
        });
      } else if (scrollFromLayoutFrames()) {
        onScrollToEntryComplete?.();
      } else {
        onScrollToEntryComplete?.();
      }
    };
    const task = InteractionManager.runAfterInteractions(() => {
      void tryMeasure();
    });
    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [
    scrollToEntryId,
    orderedIds,
    entries,
    layoutVersion,
    listOffsetY,
    listPaddingTop,
    streamScrollY,
    streamScrollYRef,
    streamScrollViewRef,
    onScrollToEntryOffset,
    onScrollToEntryComplete,
  ]);

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
      {flatItems.map((item, index) => {
        if (item.kind === 'header') {
          return (
            <View
              key={item.key}
              style={item.sectionIndex > 0 ? { marginTop: t.spacing.md } : undefined}
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
                    marginBottom: 10,
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
              searchHighlightQuery={searchHighlightQuery}
              streamGutter={streamGutter}
              onEntryPress={onEntryPress}
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
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  line: {},
  time: {
    marginTop: -2,
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
