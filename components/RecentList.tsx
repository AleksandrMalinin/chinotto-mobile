import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Entry } from '../types/entry';
import { useAppTheme } from '../theme';
import { formatEntryTime, groupEntriesByDate } from '../utils/groupEntriesByDate';

/**
 * Time-grouped stream — quiet section labels (desktop `.stream-section-title` spirit),
 * entry body + subtle time; spacing only, no borders (see design-system-mobile-companion).
 */
export type RecentListProps = {
  entries: Entry[];
  visible: boolean;
};

const ROW_PRESS_TINT = 'rgba(128, 138, 188, 0.05)';

function RecentListInner({ entries, visible }: RecentListProps) {
  const t = useAppTheme();
  const { colors, typography } = t;
  const { body, meta } = typography;

  const groups = useMemo(() => groupEntriesByDate(entries), [entries]);

  if (!visible || entries.length === 0) {
    return null;
  }

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
                color: colors.metaFg,
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
          {section.items.map((item, index) => (
            <Pressable
              key={item.id}
              accessible={true}
              accessibilityLabel={`${item.text}, ${formatEntryTime(item.createdAt)}`}
              onPress={() => {}}
              style={({ pressed }) => [
                styles.entry,
                {
                  marginBottom: index < section.items.length - 1 ? t.spacing.sm : 0,
                  paddingVertical: t.spacing.xs,
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
          ))}
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
});
