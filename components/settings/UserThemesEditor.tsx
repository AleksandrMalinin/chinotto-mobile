import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  createUserTheme,
  deleteUserTheme,
  listUserThemes,
  updateUserTheme,
} from '../../storage/themeRepository';
import { fonts, useAppTheme } from '../../theme';
import { MAX_USER_THEMES, type UserTheme } from '../../utils/entryThemes';

type Props = {
  onThemesChange?: () => void;
};

export function UserThemesEditor({ onThemesChange }: Props) {
  const t = useAppTheme();
  const [themes, setThemes] = useState<UserTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);

  const loadThemes = useCallback(() => {
    setLoading(true);
    void listUserThemes()
      .then((rows) => {
        setThemes(rows);
        const nextDrafts: Record<string, string> = {};
        for (const theme of rows) {
          nextDrafts[theme.id] = theme.label;
        }
        setDrafts(nextDrafts);
        setError(null);
      })
      .catch(() => setError('Could not load themes'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadThemes();
  }, [loadThemes]);

  const persistTheme = async (id: string) => {
    const label = (drafts[id] ?? '').trim();
    if (!label) {
      setError('Theme name is required');
      return;
    }
    try {
      const updated = await updateUserTheme(id, label);
      setThemes((prev) => prev.map((row) => (row.id === id ? updated : row)));
      setDrafts((prev) => ({ ...prev, [id]: updated.label }));
      setError(null);
      onThemesChange?.();
    } catch {
      setError('Could not save theme');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteUserTheme(id);
      setThemes((prev) => prev.filter((row) => row.id !== id));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setError(null);
      onThemesChange?.();
    } catch {
      setError('Could not delete theme');
    }
  };

  const handleAdd = async () => {
    if (themes.length >= MAX_USER_THEMES || adding) {
      return;
    }
    setAdding(true);
    try {
      const created = await createUserTheme('New theme');
      setThemes((prev) => [...prev, created]);
      setDrafts((prev) => ({ ...prev, [created.id]: created.label }));
      setError(null);
      onThemesChange?.();
    } catch {
      setError('Could not add theme');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator color={t.colors.metaFg} size="small" />
      </View>
    );
  }

  const atMax = themes.length >= MAX_USER_THEMES;

  return (
    <View style={styles.wrap}>
      {error ? (
        <Text style={[styles.error, { color: t.colors.settingsCautionLabel }]} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      {themes.map((theme, index) => (
        <View
          key={theme.id}
          style={[
            styles.row,
            {
              borderBottomColor: t.colors.border,
              borderBottomWidth: index === themes.length - 1 && atMax ? 0 : StyleSheet.hairlineWidth,
            },
          ]}
        >
          <TextInput
            value={drafts[theme.id] ?? theme.label}
            onChangeText={(value) => setDrafts((prev) => ({ ...prev, [theme.id]: value }))}
            onBlur={() => void persistTheme(theme.id)}
            placeholder="Theme name"
            placeholderTextColor={t.colors.muted}
            style={[styles.input, { color: t.colors.fg }]}
            accessibilityLabel={`Theme name for ${theme.label}`}
            returnKeyType="done"
            blurOnSubmit
          />
          <Pressable
            onPress={() => void handleDelete(theme.id)}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${theme.label}`}
            hitSlop={8}
            style={({ pressed }) => [{ opacity: pressed ? 0.65 : 1 }]}
          >
            <Text style={[styles.delete, { color: t.colors.metaFg }]}>Delete</Text>
          </Pressable>
        </View>
      ))}
      {!atMax ? (
        <Pressable
          onPress={() => void handleAdd()}
          disabled={adding}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.addRow,
            { borderTopColor: t.colors.border, opacity: pressed ? 0.7 : adding ? 0.45 : 1 },
          ]}
        >
          <Text style={[styles.add, { color: t.colors.accent }]}>{adding ? 'Adding…' : 'Add theme'}</Text>
          <Text style={[styles.count, { color: t.colors.metaFg }]}>
            {themes.length}/{MAX_USER_THEMES}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const ROW_HEIGHT = 38;
const INPUT_FONT_SIZE = 12;
const INPUT_LINE_HEIGHT = 17;

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: 0,
  },
  loadingRow: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: ROW_HEIGHT,
    paddingHorizontal: 14,
    paddingVertical: 0,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: ROW_HEIGHT,
    fontFamily: fonts.regular,
    fontSize: INPUT_FONT_SIZE,
    letterSpacing: 0.1,
    paddingHorizontal: 0,
    margin: 0,
    ...(Platform.OS === 'ios'
      ? {
          paddingTop: 11,
          paddingBottom: 10,
        }
      : {
          lineHeight: INPUT_LINE_HEIGHT,
          paddingVertical: 0,
          textAlignVertical: 'center',
          includeFontPadding: false,
        }),
  },
  delete: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: ROW_HEIGHT,
    paddingHorizontal: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  add: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  count: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
  },
});
