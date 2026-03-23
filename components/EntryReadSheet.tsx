import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Entry } from '../types/entry';
import { fonts, useAppTheme } from '../theme';
import { formatEntryTime } from '../utils/groupEntriesByDate';

export type EntryReadSheetProps = {
  visible: boolean;
  entry: Entry | null;
  onClose: () => void;
};

export function EntryReadSheet({ visible, entry, onClose }: EntryReadSheetProps) {
  const t = useAppTheme();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radius } = t;
  const { body, meta } = typography;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!visible) {
      setCopied(false);
    }
  }, [visible]);

  const handleCopy = useCallback(async () => {
    if (entry == null) {
      return;
    }
    try {
      await Clipboard.setStringAsync(entry.text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }, [entry]);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const id = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(id);
  }, [copied]);

  if (entry == null) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View
        testID="entry-read-sheet"
        style={[styles.root, { backgroundColor: 'rgba(0,0,0,0.48)' }]}
        accessibilityViewIsModal
      >
        <Pressable
          style={styles.dismissTap}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.bgElevated,
              borderColor: colors.border,
              borderTopLeftRadius: radius.lg,
              borderTopRightRadius: radius.lg,
              paddingBottom: Math.max(insets.bottom, spacing.md),
            },
          ]}
        >
          <View style={[styles.toolbar, { paddingHorizontal: spacing.lg, paddingTop: spacing.md }]}>
            <Text
              style={[
                styles.metaLine,
                {
                  color: colors.metaFg,
                  fontFamily: meta.fontFamily,
                  fontSize: meta.fontSize,
                },
              ]}
            >
              {formatEntryTime(entry.createdAt)}
            </Text>
            <Pressable
              testID="entry-read-copy"
              onPress={() => void handleCopy()}
              accessibilityRole="button"
              accessibilityLabel={copied ? 'Copied' : 'Copy text'}
              hitSlop={10}
              style={({ pressed }) => [styles.copyBtn, { opacity: pressed ? 0.65 : 1 }]}
            >
              <Text
                style={{
                  color: copied ? colors.muted : colors.fgDim,
                  fontFamily: fonts.medium,
                  fontSize: 15,
                  letterSpacing: 0.2,
                }}
              >
                {copied ? 'Copied' : 'Copy'}
              </Text>
            </Pressable>
          </View>
          <ScrollView
            style={[styles.scroll, { maxHeight: Math.min(windowHeight * 0.58, 520) }]}
            contentContainerStyle={{
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.sm,
              paddingBottom: spacing.lg,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text
              selectable
              style={[
                styles.bodyText,
                {
                  color: colors.entryBody,
                  fontFamily: body.fontFamily,
                  fontSize: 17,
                  lineHeight: 26,
                  letterSpacing: 0.15,
                },
              ]}
            >
              {entry.text}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  dismissTap: {
    flex: 1,
  },
  sheet: {
    maxHeight: '88%',
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaLine: {
    flex: 1,
    marginRight: 12,
  },
  copyBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  scroll: {},
  bodyText: {},
});
