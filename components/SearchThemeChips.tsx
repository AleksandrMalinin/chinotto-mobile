import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ThemeCount } from '../types/entryTheme';
import { fonts, useAppTheme } from '../theme';
import {
  THEME_CHIP_MIN_COUNT,
  themeLabel,
  type UserTheme,
  searchChipThemes,
} from '../utils/entryThemes';

type Props = {
  userThemes: UserTheme[];
  counts: ThemeCount[];
  selectedThemeId: string | null;
  onSelectTheme: (themeId: string | null) => void;
};

export function SearchThemeChips({
  userThemes,
  counts,
  selectedThemeId,
  onSelectTheme,
}: Props) {
  const t = useAppTheme();
  const visible = searchChipThemes(userThemes)
    .map((theme) => {
      const row = counts.find((c) => c.themeId === theme.id);
      return { ...theme, count: row?.count ?? 0 };
    })
    .filter((theme) => theme.count >= THEME_CHIP_MIN_COUNT);

  if (visible.length === 0) {
    return null;
  }

  return (
    <View style={styles.row}>
      {visible.map((theme) => {
        const active = selectedThemeId === theme.id;
        return (
          <Pressable
            key={theme.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelectTheme(active ? null : theme.id)}
            style={({ pressed }) => [
              styles.chip,
              {
                borderColor: active ? t.colors.accent : t.colors.border,
                backgroundColor: active ? t.colors.accentSubtle : 'rgba(255,255,255,0.04)',
                opacity: pressed ? 0.82 : 1,
              },
            ]}
          >
            <Text style={[styles.chipLabel, { color: active ? t.colors.accent : t.colors.metaFg }]}>
              {themeLabel(theme.id, userThemes)}
              <Text style={styles.count}> {theme.count}</Text>
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 2,
  },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  count: {
    opacity: 0.72,
    fontSize: 11,
  },
});
