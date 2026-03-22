import { memo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Entry } from '../types/entry';
import { useAppTheme } from '../theme';

export type RecentListProps = {
  entries: Entry[];
  visible: boolean;
};

function RecentListInner({ entries, visible }: RecentListProps) {
  const t = useAppTheme();
  const { colors, typography } = t;
  const { body } = typography;

  if (!visible || entries.length === 0) {
    return null;
  }

  return (
    <View style={[styles.outer, { marginHorizontal: t.spacing.sm, marginTop: t.spacing.md }]}>
      <View
        style={[
          styles.card,
          {
            paddingHorizontal: t.spacing.md,
            paddingVertical: t.spacing.sm,
            borderRadius: t.radius.lg,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: 'rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            ...Platform.select({
              ios: {
                shadowColor: 'rgba(100, 110, 180, 0.45)',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.28,
                shadowRadius: 28,
              },
              android: {
                elevation: 6,
              },
              default: {},
            }),
          },
        ]}
        pointerEvents="box-none"
      >
        {entries.map((item, index) => (
          <Pressable
            key={item.id}
            accessible={false}
            onPress={() => {}}
            style={({ pressed }) => [
              styles.row,
              index > 0 && {
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: colors.border,
              },
              { paddingVertical: t.spacing.sm },
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.line,
                {
                  color: colors.entryBody,
                  fontFamily: body.fontFamily,
                  fontSize: body.fontSize,
                  lineHeight: body.lineHeight,
                },
              ]}
              numberOfLines={3}
            >
              {item.text}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export const RecentList = memo(RecentListInner);

const styles = StyleSheet.create({
  outer: {},
  card: {},
  row: {},
  pressed: {
    opacity: 0.85,
  },
  line: {},
});
