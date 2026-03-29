import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import type { Entry } from '../types/entry';
import { fonts, useAppTheme } from '../theme';
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
};

const DELETE_ACTION_WIDTH = 76;

/** Pressed row: slightly above `accentSubtle` so it reads as a container, not text selection. */
function entryPressedBackground(isDark: boolean): string {
  return isDark ? 'rgba(128, 138, 188, 0.11)' : 'rgba(100, 110, 180, 0.1)';
}

function RecentListInner({
  entries,
  visible,
  emptyHint,
  listFooterHint,
  onEntryPress,
  onEntryDelete,
}: RecentListProps) {
  const t = useAppTheme();
  const { colors, typography, isDark, radius: themeRadius } = t;
  const { body, meta } = typography;

  const groups = useMemo(() => groupEntriesByDate(entries), [entries]);

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

  const renderRow = (item: Entry, isLastInSection: boolean) => {
    const rowContent = (
      <View
        style={[
          styles.rowOuter,
          !isLastInSection && {
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.border,
          },
        ]}
      >
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
          style={styles.pressableFill}
        >
          {({ pressed }) => (
            <View
              style={[
                styles.entryBlock,
                {
                  borderRadius: themeRadius.sm,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: pressed ? colors.border : 'transparent',
                  backgroundColor: pressed ? entryPressedBackground(isDark) : 'transparent',
                },
              ]}
            >
              <View style={styles.entryRow}>
                <Text
                  style={[
                    styles.line,
                    {
                      flex: 1,
                      color: colors.entryBody,
                      fontFamily: body.fontFamily,
                      fontSize: body.fontSize,
                      lineHeight: body.lineHeight,
                      letterSpacing: 0.16,
                      marginRight: t.spacing.sm,
                    },
                  ]}
                  numberOfLines={4}
                >
                  {item.text}
                </Text>
                <Text
                  style={[
                    styles.time,
                    {
                      color: colors.metaFg,
                      fontFamily: meta.fontFamily,
                      fontSize: 12,
                      lineHeight: 16,
                    },
                  ]}
                >
                  {formatEntryTime(item.createdAt)}
                </Text>
              </View>
            </View>
          )}
        </Pressable>
      </View>
    );

    if (onEntryDelete == null) {
      return (
        <View key={item.id}>
          {rowContent}
        </View>
      );
    }

    return (
      <Swipeable
        key={item.id}
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
  };

  return (
    <View testID="recent-list" style={[styles.list, { paddingTop: t.spacing.lg }]}>
      {groups.map((section, sIndex) => (
        <View
          key={section.label + String(sIndex)}
          style={[
            styles.section,
            sIndex > 0 && { marginTop: t.spacing.md },
          ]}
        >
          <Text
            accessibilityRole="header"
            style={[
              styles.sectionLabel,
              {
                color: colors.sectionFg,
                fontFamily: meta.fontFamily,
                fontSize: meta.fontSize,
                lineHeight: 18,
                letterSpacing: 0.26,
                marginBottom: t.spacing.xs,
              },
            ]}
          >
            {section.label}
          </Text>
          {section.items.map((item, index) => {
            const isLastInSection = index === section.items.length - 1;
            return renderRow(item, isLastInSection);
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
  pressableFill: {
    width: '100%',
    alignSelf: 'stretch',
  },
  /**
   * Full-width block; padding is always applied so press only changes fill/border (no layout jump).
   * Vertical padding kept moderate for a tight stream.
   */
  entryBlock: {
    width: '100%',
    paddingVertical: 11,
    paddingHorizontal: 15,
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
