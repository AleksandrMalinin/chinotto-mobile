import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Entry } from '../types/entry';
import { fonts, screenContentGutter, useAppTheme } from '../theme';
import { displayHostForUrl, extractHttpUrlsFromText } from '../utils/extractHttpUrlsFromText';
import { formatEntryTime } from '../utils/groupEntriesByDate';

export type EntryReadSheetProps = {
  visible: boolean;
  entry: Entry | null;
  onClose: () => void;
};

export function EntryReadSheet({ visible, entry, onClose }: EntryReadSheetProps) {
  const t = useAppTheme();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radius } = t;
  const contentInset = screenContentGutter(windowWidth);
  const { body, meta } = typography;
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const comfortableReading = (entry?.text.length ?? 0) >= 380;
  const scrollMaxHeight = Math.min(
    windowHeight * (comfortableReading ? 0.62 : 0.58),
    comfortableReading ? 560 : 520
  );

  const httpUrls = useMemo(
    () => (entry != null ? extractHttpUrlsFromText(entry.text) : []),
    [entry]
  );
  const firstHttpUrl = httpUrls[0] ?? null;
  const linkHost = firstHttpUrl != null ? displayHostForUrl(firstHttpUrl) : null;
  const linkCount = httpUrls.length;

  useEffect(() => {
    if (!visible) {
      setCopied(false);
    }
  }, [visible]);

  useEffect(() => {
    if (visible && entry != null) {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  }, [visible, entry?.id]);

  const handleOpenLink = useCallback(async () => {
    if (firstHttpUrl == null) {
      return;
    }
    try {
      await Linking.openURL(firstHttpUrl);
    } catch (err) {
      if (__DEV__) {
        console.warn('EntryReadSheet openURL failed', err);
      }
    }
  }, [firstHttpUrl]);

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
      presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : 'fullScreen'}
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
          <View style={{ paddingHorizontal: contentInset, paddingTop: spacing.md }}>
            <View style={styles.toolbarTopRow}>
              <Text
                style={[
                  styles.metaTime,
                  {
                    flex: 1,
                    minWidth: 0,
                    marginRight: spacing.sm,
                    color: colors.metaFg,
                    fontFamily: meta.fontFamily,
                    fontSize: meta.fontSize,
                    lineHeight: 20,
                  },
                ]}
                numberOfLines={1}
              >
                {formatEntryTime(entry.createdAt)}
              </Text>
              <View style={styles.toolbarActions}>
                {firstHttpUrl != null ? (
                  <Pressable
                    testID="entry-read-open-link"
                    onPress={() => void handleOpenLink()}
                    accessibilityRole="button"
                    accessibilityLabel={
                      linkCount > 1 ? 'Open first link in browser' : 'Open link in browser'
                    }
                    hitSlop={10}
                    style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.65 : 1 }]}
                  >
                    <Text
                      style={{
                        color: colors.fgDim,
                        fontFamily: fonts.medium,
                        fontSize: 15,
                        lineHeight: 20,
                        letterSpacing: 0.2,
                      }}
                    >
                      {linkCount > 1 ? 'Open first' : 'Open'}
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  testID="entry-read-copy"
                  onPress={() => void handleCopy()}
                  accessibilityRole="button"
                  accessibilityLabel={copied ? 'Copied' : 'Copy text'}
                  hitSlop={10}
                  style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.65 : 1 }]}
                >
                  <Text
                    style={{
                      color: copied ? colors.muted : colors.fgDim,
                      fontFamily: fonts.medium,
                      fontSize: 15,
                      lineHeight: 20,
                      letterSpacing: 0.2,
                    }}
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </Text>
                </Pressable>
              </View>
            </View>
            {linkHost != null ? (
              <Text
                testID="entry-read-link-host"
                accessibilityLabel={`Link from ${linkHost}`}
                style={[
                  styles.metaHost,
                  {
                    color: colors.sectionFg,
                    fontFamily: meta.fontFamily,
                    fontSize: 12,
                  },
                ]}
                numberOfLines={1}
              >
                {linkHost}
              </Text>
            ) : null}
          </View>
          {linkCount > 1 ? (
            <View
              testID="entry-read-link-list"
              style={[
                styles.linkList,
                {
                  paddingHorizontal: contentInset,
                  paddingTop: spacing.xs,
                  paddingBottom: spacing.sm,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.linkListTitle,
                  {
                    color: colors.sectionFg,
                    fontFamily: meta.fontFamily,
                    fontSize: meta.fontSize,
                    letterSpacing: 0.2,
                  },
                ]}
              >
                Links
              </Text>
              {httpUrls.map((url, i) => (
                <Text
                  key={`${i}-${url}`}
                  selectable
                  numberOfLines={4}
                  style={[
                    styles.linkListRow,
                    {
                      color: colors.metaFg,
                      fontFamily: meta.fontFamily,
                      fontSize: 13,
                      lineHeight: 19,
                      marginTop: spacing.xs,
                    },
                  ]}
                >
                  {i + 1}. {url}
                </Text>
              ))}
              <Text
                style={[
                  styles.linkListHint,
                  {
                    color: colors.muted,
                    fontFamily: meta.fontFamily,
                    fontSize: 11,
                    marginTop: spacing.sm,
                    letterSpacing: 0.12,
                  },
                ]}
              >
                Open uses link 1. Copy saves the full thought.
              </Text>
            </View>
          ) : null}
          <ScrollView
            ref={scrollRef}
            testID="entry-read-scroll"
            style={[styles.scroll, { maxHeight: scrollMaxHeight }]}
            contentContainerStyle={{
              paddingHorizontal: contentInset,
              paddingTop: spacing.sm,
              paddingBottom: comfortableReading ? spacing.lg + spacing.sm : spacing.lg,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={comfortableReading}
          >
            <Text
              testID="entry-read-body"
              selectable
              style={[
                styles.bodyText,
                {
                  color: colors.entryBody,
                  fontFamily: body.fontFamily,
                  fontSize: 17,
                  lineHeight: comfortableReading ? 28 : 26,
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
  toolbarTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaTime: {},
  metaHost: {
    marginTop: 4,
    letterSpacing: 0.2,
  },
  linkList: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  linkListTitle: {},
  linkListRow: {},
  linkListHint: {},
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 8,
  },
  actionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  scroll: {},
  bodyText: {},
});
