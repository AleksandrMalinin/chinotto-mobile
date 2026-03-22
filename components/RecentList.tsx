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
 * Delete: **swipe left** past threshold (reveals delete track, commits on open) or **long press**
 * — no confirmation; local-first + tombstone queue (see `deleteEntry`).
 */
export type RecentListProps = {
  entries: Entry[];
  visible: boolean;
  onEntryDelete?: (entry: Entry) => void;
};

const ROW_PRESS_TINT = 'rgba(128, 138, 188, 0.05)';
const DELETE_ACTION_WIDTH = 76;

/** Muted destructive — readable on dark shell without loud chrome. */
const DELETE_TRACK_BG = 'rgba(160, 72, 72, 0.92)';

function RecentListInner({ entries, visible, onEntryDelete }: RecentListProps) {
  const t = useAppTheme();
  const { colors, typography } = t;
  const { body, meta } = typography;

  const groups = useMemo(() => groupEntriesByDate(entries), [entries]);

  if (!visible || entries.length === 0) {
    return null;
  }

  const renderRow = (item: Entry, isLastInSection: boolean) => {
    const rowContent = (
      <Pressable
        accessible={true}
        accessibilityLabel={`${item.text}, ${formatEntryTime(item.createdAt)}`}
        accessibilityHint={onEntryDelete != null ? 'Swipe left to delete, or long press to delete' : undefined}
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
        delayLongPress={onEntryDelete != null ? 380 : undefined}
        onLongPress={onEntryDelete != null ? () => onEntryDelete(item) : undefined}
        onPress={() => {}}
        style={({ pressed }) => [
          styles.entry,
          {
            paddingVertical: t.spacing.sm,
            borderBottomWidth: isLastInSection ? 0 : StyleSheet.hairlineWidth,
            borderBottomColor: colors.border,
            backgroundColor: pressed ? ROW_PRESS_TINT : 'transparent',
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
      </Pressable>
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
                backgroundColor: DELETE_TRACK_BG,
              },
            ]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Text style={[styles.deleteLabel, { fontFamily: fonts.medium }]}>Delete</Text>
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
                marginBottom: t.spacing.sm,
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
    </View>
  );
}

export const RecentList = memo(RecentListInner);

const styles = StyleSheet.create({
  list: {
    width: '100%',
  },
  section: {},
  sectionLabel: {},
  entry: {},
  entryRow: {
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
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
