import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useEntryContinuation } from '../hooks/useEntryContinuation';
import type { Entry } from '../types/entry';
import { fonts, screenContentGutter, useAppTheme } from '../theme';
import { displayHostForUrl, extractHttpUrlsFromText } from '../utils/extractHttpUrlsFromText';
import { formatEntryTime } from '../utils/groupEntriesByDate';
import {
  thoughtSheetCompactScrollMaxHeight,
  thoughtSheetExpandedHeight,
  type ThoughtSheetOpenAnchor,
} from './thoughtSheet/detents';
import { useSheetPanActions } from './thoughtSheet/useSheetPanActions';

/**
 * SHEET SHELL LAYOUT (do not break — see .cursor/rules/entry-thought-sheet-layout.mdc):
 * Modal → GestureHandlerRootView flex:1 → root flex:1 + scrim → dismiss flex:1 → sheet View (last child).
 * No KeyboardAvoidingView, absolute bottom, translateY, or Animated wrapper on the sheet shell.
 */
export type EntryThoughtSheetProps = {
  visible: boolean;
  entry: Entry | null;
  openAnchor?: ThoughtSheetOpenAnchor | null;
  onClose: () => void;
  onEntryUpdated?: (entry: Entry) => void;
  hapticsEnabled?: boolean;
};

type SheetPhase = 'compact' | 'expanded';

export function EntryThoughtSheet({
  visible,
  entry,
  onClose,
  onEntryUpdated,
  hapticsEnabled = true,
}: EntryThoughtSheetProps) {
  const t = useAppTheme();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radius } = t;
  const contentInset = screenContentGutter(windowWidth);
  const { body, meta, capture } = typography;
  const [copied, setCopied] = useState(false);
  const [phase, setPhase] = useState<SheetPhase>('compact');
  const [keyboardInset, setKeyboardInset] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const closingRef = useRef(false);
  const phaseRef = useRef<SheetPhase>('compact');
  const scrollYRef = useRef(0);
  const expandedHeight = thoughtSheetExpandedHeight(windowHeight, insets);
  const lastBodyTapAtRef = useRef(0);

  const { draft, setDraft, isEditing, beginEditing, endEditing, resetForClose, flushSave } =
    useEntryContinuation({
    visible,
    entry,
    onSaved: onEntryUpdated,
  });

  const isExpanded = phase === 'expanded';
  const comfortableReading = !isExpanded && draft.length >= 380;
  const scrollMaxHeight = thoughtSheetCompactScrollMaxHeight(windowHeight, comfortableReading);
  const expandedEditorMaxHeight = Math.min(expandedHeight * 0.72, 560);
  const showEditor = isExpanded && isEditing;

  const httpUrls = useMemo(
    () => extractHttpUrlsFromText(isExpanded ? draft : (entry?.text ?? '')),
    [draft, entry?.text, isExpanded]
  );
  const firstHttpUrl = httpUrls[0] ?? null;
  const linkHost = firstHttpUrl != null ? displayHostForUrl(firstHttpUrl) : null;
  const linkCount = httpUrls.length;

  phaseRef.current = phase;

  const playSheetHaptic = useCallback(() => {
    if (!hapticsEnabled || Platform.OS === 'web') {
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [hapticsEnabled]);

  const handleClose = useCallback(() => {
    if (closingRef.current) {
      return;
    }
    closingRef.current = true;
    Keyboard.dismiss();
    setKeyboardInset(0);
    void resetForClose().finally(() => {
      closingRef.current = false;
      setPhase('compact');
      phaseRef.current = 'compact';
      onClose();
    });
  }, [onClose, resetForClose]);

  const expandSheetRef = useRef<() => void>(() => {});
  const collapseSheetRef = useRef<() => void>(() => {});

  const { onHandlerStateChange } = useSheetPanActions({
    mode: phase,
    scrollYRef,
    onExpand: () => expandSheetRef.current(),
    onCollapse: () => collapseSheetRef.current(),
    onDismiss: handleClose,
  });

  const expandSheet = useCallback(() => {
    if (phaseRef.current === 'expanded') {
      return;
    }
    beginEditing();
    setPhase('expanded');
    phaseRef.current = 'expanded';
    playSheetHaptic();
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [beginEditing, playSheetHaptic]);

  const collapseSheet = useCallback(() => {
    if (phaseRef.current === 'compact') {
      return;
    }
    Keyboard.dismiss();
    void flushSave();
    endEditing();
    setKeyboardInset(0);
    playSheetHaptic();
    setPhase('compact');
    phaseRef.current = 'compact';
  }, [endEditing, flushSave, playSheetHaptic]);

  expandSheetRef.current = expandSheet;
  collapseSheetRef.current = collapseSheet;

  useEffect(() => {
    if (!visible) {
      setCopied(false);
      setPhase('compact');
      phaseRef.current = 'compact';
      setKeyboardInset(0);
      scrollYRef.current = 0;
      return;
    }
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [visible, entry?.id]);

  useEffect(() => {
    if (!visible || !isExpanded) {
      setKeyboardInset(0);
      return;
    }
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (event: { endCoordinates: { height: number } }) => {
      setKeyboardInset(event.endCoordinates.height);
    };
    const onHide = () => {
      setKeyboardInset(0);
    };
    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible, isExpanded]);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const id = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(id);
  }, [copied]);

  const handleOpenLink = useCallback(async () => {
    if (firstHttpUrl == null) {
      return;
    }
    try {
      await Linking.openURL(firstHttpUrl);
    } catch (err) {
      if (__DEV__) {
        console.warn('EntryThoughtSheet openURL failed', err);
      }
    }
  }, [firstHttpUrl]);

  const handleCopy = useCallback(async () => {
    if (entry == null) {
      return;
    }
    try {
      await Clipboard.setStringAsync(draft);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }, [draft, entry]);

  const handleBodyPress = useCallback(() => {
    if (phaseRef.current !== 'compact') {
      return;
    }
    const now = Date.now();
    if (now - lastBodyTapAtRef.current <= 320) {
      expandSheet();
      lastBodyTapAtRef.current = 0;
      return;
    }
    lastBodyTapAtRef.current = now;
  }, [expandSheet]);

  if (entry == null) {
    return null;
  }

  const dragStrip = (
    <View style={styles.dragStrip}>
      <View style={styles.grabberZone}>
        <View
          testID="entry-thought-grabber"
          style={[styles.grabber, { backgroundColor: colors.muted }]}
          accessibilityRole="adjustable"
          accessibilityLabel="Drag up to continue this thought, drag down to dismiss"
        />
      </View>
      <View style={{ paddingHorizontal: contentInset }}>
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
          <View style={[styles.toolbarActions, isExpanded ? styles.toolbarActionsDim : null]}>
            {firstHttpUrl != null ? (
              <Pressable
                testID="entry-read-open-link"
                onPress={() => void handleOpenLink()}
                accessibilityRole="button"
                accessibilityLabel={linkCount > 1 ? 'Open first link in browser' : 'Open link in browser'}
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
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : 'fullScreen'}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.rootGestureHost}>
        <View
          testID="entry-read-sheet"
          style={[styles.root, { backgroundColor: isExpanded ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.48)' }]}
          accessibilityViewIsModal
        >
          <Pressable
            style={styles.dismissRegion}
            onPress={isExpanded ? collapseSheet : handleClose}
            accessibilityRole="button"
            accessibilityLabel={isExpanded ? 'Collapse thought sheet' : 'Dismiss'}
          />

          <View
            testID="entry-thought-sheet"
            style={[
              styles.sheet,
              {
                backgroundColor: colors.bgElevated,
                borderColor: colors.border,
                borderTopLeftRadius: radius.lg,
                borderTopRightRadius: radius.lg,
                paddingBottom: Math.max(insets.bottom, spacing.md),
                maxHeight: isExpanded ? expandedHeight : '88%',
              },
            ]}
          >
              <PanGestureHandler
                onHandlerStateChange={onHandlerStateChange}
                activeOffsetY={[-12, 12]}
                failOffsetX={[-24, 24]}
              >
                <View>{dragStrip}</View>
              </PanGestureHandler>

              {linkCount > 1 && !isExpanded ? (
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

              {showEditor ? (
                <View
                  style={[
                    styles.editorWrap,
                    {
                      paddingHorizontal: contentInset,
                      paddingTop: spacing.sm,
                      paddingBottom: spacing.lg + keyboardInset,
                      maxHeight: expandedEditorMaxHeight,
                    },
                  ]}
                >
                  <TextInput
                    ref={inputRef}
                    testID="entry-thought-input"
                    value={draft}
                    onChangeText={setDraft}
                    multiline
                    scrollEnabled
                    blurOnSubmit={false}
                    autoCorrect
                    autoCapitalize="sentences"
                    keyboardAppearance={t.isDark ? 'dark' : 'light'}
                    textAlignVertical="top"
                    style={[
                      styles.bodyText,
                      styles.expandedEditor,
                      {
                        color: colors.entryBody,
                        fontFamily: capture.fontFamily,
                        fontSize: capture.fontSize,
                        lineHeight: capture.lineHeight + 2,
                        letterSpacing: capture.letterSpacing,
                      },
                    ]}
                  />
                </View>
              ) : (
                <ScrollView
                  ref={scrollRef}
                  testID="entry-read-scroll"
                  style={[styles.scroll, { maxHeight: scrollMaxHeight }]}
                  onScroll={(event) => {
                    scrollYRef.current = event.nativeEvent.contentOffset.y;
                  }}
                  scrollEventThrottle={16}
                  contentContainerStyle={{
                    paddingHorizontal: contentInset,
                    paddingTop: spacing.sm,
                    paddingBottom: comfortableReading ? spacing.lg + spacing.sm : spacing.lg,
                  }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={comfortableReading}
                >
                  <Pressable
                    onPress={handleBodyPress}
                    accessibilityRole="text"
                    accessibilityHint="Double tap to continue this thought"
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
                      {draft}
                    </Text>
                  </Pressable>
                </ScrollView>
              )}
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  rootGestureHost: {
    flex: 1,
  },
  root: {
    flex: 1,
  },
  dismissRegion: {
    flex: 1,
  },
  sheet: {
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  dragStrip: {
    width: '100%',
  },
  grabberZone: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 999,
    opacity: 0.55,
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
  toolbarActionsDim: {
    opacity: 0.72,
  },
  actionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  scroll: {},
  editorWrap: {
    width: '100%',
  },
  bodyText: {
    padding: 0,
  },
  expandedEditor: {
    flexGrow: 1,
    minHeight: 160,
  },
});
