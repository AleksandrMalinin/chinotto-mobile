import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
};

const DELETE_ACTION_WIDTH = 76;

/** Parent should clear `highlightEntryId` after this (full fade + small buffer). */
export const STREAM_HIGHLIGHT_CLEAR_AFTER_MS = 0;

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
          borderBottomColor: colors.border,
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
                  color: colors.entryBody,
                  fontFamily: isNewest ? fonts.medium : body.fontFamily,
                  fontSize: isNewest ? 17 : body.fontSize,
                  lineHeight: isNewest ? 26 : body.lineHeight,
                  letterSpacing: isNewest ? 0.17 : 0.16,
                  marginRight: t.spacing.sm,
                  opacity: isNewest ? 1 : 0.84,
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
                  fontFamily: fonts.regular,
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

function RecentListInner({
  entries,
  visible,
  emptyHint,
  listFooterHint,
  onEntryPress,
  onEntryDelete,
  highlightEntryId = null,
}: RecentListProps) {
  const { width: windowWidth } = useWindowDimensions();
  const streamGutter = screenContentGutter(windowWidth);
  const t = useAppTheme();
  const { colors, typography, isDark } = t;
  const { meta } = typography;

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
      <View testID="recent-list" style={[styles.list, { paddingTop: t.spacing.lg }]}>
        <Text
          testID="recent-list-empty-hint"
          accessibilityRole="text"
          style={[
            styles.emptyHint,
            {
              paddingHorizontal: streamGutter,
              color: colors.muted,
              fontFamily: meta.fontFamily,
              fontSize: meta.fontSize,
              lineHeight: 20,
            },
          ]}
        >
          {emptyHint}
        </Text>
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
                color: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.2)',
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
    paddingVertical: 4,
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
