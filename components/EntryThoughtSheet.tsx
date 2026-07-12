import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Alert,
  Keyboard,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  GestureHandlerRootView,
  NativeViewGestureHandler,
  PanGestureHandler,
  ScrollView as GestureScrollView,
  State,
} from 'react-native-gesture-handler';
import type {
  NativeViewGestureHandler as NativeViewGestureHandlerType,
  PanGestureHandler as PanGestureHandlerType,
} from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useEntryContinuation } from '../hooks/useEntryContinuation';
import { getAllEntries } from '../storage/entryRepository';
import { getEntryTheme, setEntryTheme } from '../storage/themeRepository';
import type { EntryTheme } from '../types/entryTheme';
import type { Entry } from '../types/entry';
import {
  ENTRY_THEME_CLEAR_LABEL,
  recallThemeOptions,
  entryThemeTriggerLabel,
  SYSTEM_THEME_LINKS,
  themeLabel,
  type UserTheme,
} from '../utils/entryThemes';
import { ThoughtTrailRail } from './ThoughtTrailRail';
import { SheetEditVoiceDock } from './SheetEditVoiceDock';
import { fonts, screenContentGutter, useAppTheme } from '../theme';
import { displayHostForUrl, extractHttpUrlsFromText } from '../utils/extractHttpUrlsFromText';
import { formatEntryTime } from '../utils/groupEntriesByDate';
import { buildThoughtTrailNeighbors } from '../utils/thoughtTrail';
import {
  shouldCollapseExpandedThoughtSheet,
  shouldDismissExpandedThoughtSheet,
  shouldDismissThoughtSheet,
  shouldExpandThoughtSheet,
  thoughtSheetCompactScrollMaxHeight,
  thoughtSheetExpandedHeight,
  thoughtSheetExpandedHeightWithKeyboard,
  type ThoughtSheetOpenAnchor,
} from './thoughtSheet/detents';
import { useVoiceDraftEdit } from '../src/features/voiceCapture/useVoiceDraftEdit';
import { useSheetDragDismiss } from './thoughtSheet/useSheetDragDismiss';
import {
  useSheetEnterAnimation,
  type SheetEnterProfile,
} from './thoughtSheet/useSheetEnterAnimation';
import {
  thoughtSheetBackdropA11yLabel,
} from './thoughtSheet/backdropAction';

/** Read body — matches stream newest row. Continue/edit uses smaller type for room. */
const SHEET_READ_FONT_SIZE = 16;
const SHEET_READ_LINE_HEIGHT = 22;
const SHEET_READ_LINE_HEIGHT_COMFORTABLE = 24;
const SHEET_EDIT_FONT_SIZE = 15;
const SHEET_EDIT_LINE_HEIGHT = 22;

/**
 * SHEET SHELL LAYOUT (do not break — see .cursor/rules/entry-thought-sheet-layout.mdc):
 * Modal → GestureHandlerRootView flex:1 → root flex:1 + scrim → dismiss flex:1 → Pan → Animated sheet (last child).
 * No KeyboardAvoidingView or absolute bottom on the modal root. Drag/enter translate the whole sheet node.
 */
export type EntryThoughtSheetProps = {
  visible: boolean;
  entry: Entry | null;
  openAnchor?: ThoughtSheetOpenAnchor | null;
  onClose: () => void;
  onEntryUpdated?: (entry: Entry) => void;
  onTrailEntrySelect?: (entry: Entry) => void;
  hapticsEnabled?: boolean;
  /** Light impact when the sheet presents (e.g. stream recall open). */
  hapticOnPresent?: boolean;
  /** Slower enter from Echo — lift into awareness, not route push. */
  enterProfile?: SheetEnterProfile;
  /** Open expanded in edit mode — Echo resume. */
  resumeOnOpen?: boolean;
  themesEnabled?: boolean;
  userThemes?: UserTheme[];
  onThemeAssigned?: () => void;
};

type SheetPhase = 'compact' | 'expanded';

export function EntryThoughtSheet({
  visible,
  entry,
  onClose,
  onEntryUpdated,
  onTrailEntrySelect,
  hapticsEnabled = true,
  hapticOnPresent = false,
  enterProfile = 'stream',
  resumeOnOpen = false,
  themesEnabled = true,
  userThemes = [],
  onThemeAssigned,
}: EntryThoughtSheetProps) {
  const t = useAppTheme();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radius } = t;
  const contentInset = screenContentGutter(windowWidth);
  const { body, meta } = typography;
  const [copied, setCopied] = useState(false);
  const [trailEarlier, setTrailEarlier] = useState<Entry[]>([]);
  const [trailLater, setTrailLater] = useState<Entry[]>([]);
  const [phase, setPhase] = useState<SheetPhase>('compact');
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [entryTheme, setEntryThemeState] = useState<EntryTheme | null>(null);
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [themeSaving, setThemeSaving] = useState(false);
  const scrollRef = useRef<GestureScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const closingRef = useRef(false);
  const phaseRef = useRef<SheetPhase>('compact');
  const scrollYRef = useRef(0);
  const panRef = useRef<PanGestureHandlerType>(null);
  const scrollGestureRef = useRef<NativeViewGestureHandlerType>(null);
  const dragKeyboardDismissedRef = useRef(false);
  const expandedSheetHeight = thoughtSheetExpandedHeightWithKeyboard(
    windowHeight,
    insets,
    keyboardInset,
  );
  const dismissTravel = Math.round(windowHeight);
  const lastBodyTapAtRef = useRef(0);

  const { draft, setDraft, isEditing, beginEditing, endEditing, resetForClose, flushSave } =
    useEntryContinuation({
    visible,
    entry,
    onSaved: onEntryUpdated,
  });

  useEffect(() => {
    if (!visible || !entry) {
      setTrailEarlier([]);
      setTrailLater([]);
      return;
    }
    let cancelled = false;
    void getAllEntries().then((all) => {
      if (cancelled) {
        return;
      }
      const neighbors = buildThoughtTrailNeighbors(entry, all);
      setTrailEarlier(neighbors.earlier);
      setTrailLater(neighbors.later);
    });
    return () => {
      cancelled = true;
    };
  }, [visible, entry]);

  useEffect(() => {
    if (!visible || entry == null || !themesEnabled) {
      setEntryThemeState(null);
      setThemePickerOpen(false);
      return;
    }
    let cancelled = false;
    void getEntryTheme(entry.id).then((row) => {
      if (!cancelled) {
        setEntryThemeState(row);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [visible, entry?.id, themesEnabled]);

  const themeSegments = useMemo(
    () => [
      { themeId: SYSTEM_THEME_LINKS, label: 'Links' },
      ...recallThemeOptions(userThemes).map((theme) => ({
        themeId: theme.id,
        label: theme.label,
      })),
      { themeId: null as string | null, label: ENTRY_THEME_CLEAR_LABEL },
    ],
    [userThemes],
  );

  const assignedThemeLabel = entryThemeTriggerLabel(entryTheme?.themeId, userThemes);
  const hasAssignedTheme = entryTheme?.themeId != null;

  const activateTheme = useCallback(
    async (nextThemeId: string | null) => {
      if (entry == null) {
        return;
      }
      if (nextThemeId === (entryTheme?.themeId ?? null)) {
        setThemePickerOpen(false);
        return;
      }
      setThemeSaving(true);
      try {
        await setEntryTheme(entry.id, nextThemeId, true);
        const row = await getEntryTheme(entry.id);
        setEntryThemeState(row);
        setThemePickerOpen(false);
        onThemeAssigned?.();
      } finally {
        setThemeSaving(false);
      }
    },
    [entry, entryTheme?.themeId, onThemeAssigned],
  );

  const isExpanded = phase === 'expanded';
  const comfortableReading = !isExpanded && draft.length >= 380;
  const scrollMaxHeight = thoughtSheetCompactScrollMaxHeight(windowHeight, comfortableReading);
  const showEditor = isExpanded && isEditing;

  const onSheetVoiceError = useCallback((code: string, message?: string) => {
    if (code === 'permission_denied') {
      Alert.alert(
        'Microphone access is off',
        'Enable microphone and speech recognition in iOS Settings to dictate into this thought.',
        [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              void Linking.openSettings().catch(() => {});
            },
          },
        ],
      );
      return;
    }
    if (code === 'recognizer_unavailable' || code === 'start_failed') {
      Alert.alert(
        'Voice capture unavailable',
        message ?? 'Speech recognition could not start. Try again in a moment.',
      );
    }
  }, []);

  const {
    phase: sheetVoicePhase,
    supported: sheetVoiceSupported,
    toggleVoice: toggleSheetVoice,
    stopVoice: stopSheetVoice,
  } = useVoiceDraftEdit({
    draft,
    setDraft,
    enabled: visible && showEditor,
    hapticsEnabled,
    onError: onSheetVoiceError,
  });

  const { scrimOpacity, contentOpacity, contentTranslateY } = useSheetEnterAnimation(
    visible,
    entry?.id,
    enterProfile,
  );
  const scrimColor = isExpanded ? colors.bgElevated : 'rgba(0,0,0,0.48)';

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

  useEffect(() => {
    if (!visible || entry == null || !hapticOnPresent) {
      return;
    }
    playSheetHaptic();
  }, [visible, entry?.id, hapticOnPresent, playSheetHaptic]);

  const handleClose = useCallback(() => {
    if (closingRef.current) {
      return;
    }
    closingRef.current = true;
    stopSheetVoice();
    Keyboard.dismiss();
    setKeyboardInset(0);
    void resetForClose().finally(() => {
      closingRef.current = false;
      setPhase('compact');
      phaseRef.current = 'compact';
      onClose();
    });
  }, [onClose, resetForClose, stopSheetVoice]);

  const {
    dragY,
    onGestureEvent,
    animateDismiss,
    springBack,
    resetDrag,
    scrimDragMultiplier,
  } = useSheetDragDismiss({
    travel: dismissTravel,
    onDismiss: handleClose,
    canDrag: () => phaseRef.current === 'expanded' || scrollYRef.current <= 4,
  });

  const requestDismiss = useCallback(
    (fromY = 0, velocityY = 0) => {
      animateDismiss(fromY, velocityY);
    },
    [animateDismiss],
  );

  const expandSheet = useCallback(() => {
    if (phaseRef.current === 'expanded') {
      return;
    }
    resetDrag();
    beginEditing();
    setPhase('expanded');
    phaseRef.current = 'expanded';
    playSheetHaptic();
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [beginEditing, playSheetHaptic, resetDrag]);

  useEffect(() => {
    if (!visible || entry == null || !resumeOnOpen) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      expandSheet();
    });
    return () => cancelAnimationFrame(frame);
  }, [visible, entry?.id, resumeOnOpen, expandSheet]);

  const collapseSheet = useCallback(() => {
    if (phaseRef.current === 'compact') {
      return;
    }
    stopSheetVoice();
    Keyboard.dismiss();
    void flushSave();
    endEditing();
    setKeyboardInset(0);
    playSheetHaptic();
    setPhase('compact');
    phaseRef.current = 'compact';
    springBack();
  }, [endEditing, flushSave, playSheetHaptic, springBack, stopSheetVoice]);

  const onSheetPanStateChange = useCallback(
    (event: { nativeEvent: { oldState: number; state: number; translationY: number; velocityY: number } }) => {
      const { oldState, state, translationY, velocityY } = event.nativeEvent;
      if (state === State.BEGAN) {
        dragKeyboardDismissedRef.current = false;
      }
      if (
        !dragKeyboardDismissedRef.current &&
        state === State.ACTIVE &&
        translationY > 10 &&
        phaseRef.current === 'expanded'
      ) {
        dragKeyboardDismissedRef.current = true;
        Keyboard.dismiss();
        setKeyboardInset(0);
      }
      if (oldState !== State.ACTIVE) {
        return;
      }
      if (state !== State.END && state !== State.CANCELLED) {
        return;
      }

      if (translationY < 0) {
        if (
          phaseRef.current === 'compact' &&
          (scrollYRef.current ?? 0) <= 4 &&
          shouldExpandThoughtSheet(translationY, velocityY)
        ) {
          expandSheet();
        } else {
          springBack();
        }
        return;
      }

      if (phaseRef.current === 'compact') {
        if ((scrollYRef.current ?? 0) > 4 && translationY > 0) {
          springBack();
          return;
        }
        if (shouldDismissThoughtSheet(translationY, velocityY)) {
          requestDismiss(translationY, velocityY);
        } else {
          springBack();
        }
        return;
      }

      if (shouldDismissExpandedThoughtSheet(translationY, velocityY)) {
        requestDismiss(translationY, velocityY);
        return;
      }
      if (shouldCollapseExpandedThoughtSheet(translationY, velocityY)) {
        collapseSheet();
        return;
      }
      springBack();
    },
    [collapseSheet, expandSheet, requestDismiss, springBack],
  );

  useEffect(() => {
    if (!visible) {
      setCopied(false);
      setPhase('compact');
      phaseRef.current = 'compact';
      setKeyboardInset(0);
      scrollYRef.current = 0;
      return;
    }
    scrollYRef.current = 0;
    resetDrag();
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [visible, entry?.id, resetDrag]);

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

  const handleBackdropPress = useCallback(() => {
    requestDismiss(0, 0);
  }, [requestDismiss]);

  const sheetTranslateY = useMemo(
    () => Animated.add(contentTranslateY, dragY),
    [contentTranslateY, dragY],
  );

  const combinedScrimOpacity = useMemo(
    () => Animated.multiply(scrimOpacity, scrimDragMultiplier),
    [scrimOpacity, scrimDragMultiplier],
  );

  const backdropA11yLabel = thoughtSheetBackdropA11yLabel();

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
      <View style={isExpanded ? styles.grabberZoneExpanded : styles.grabberZone}>
        <View
          testID={isExpanded ? 'entry-thought-grabber-expanded' : 'entry-thought-grabber'}
          style={[styles.grabber, { backgroundColor: colors.muted }]}
          accessibilityRole="adjustable"
          accessibilityLabel={
            isExpanded
              ? 'Swipe down to return to your stream'
              : 'Drag up to continue this thought, drag down to dismiss'
          }
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
        {themesEnabled ? (
          <View style={{ marginTop: spacing.sm }}>
            {themePickerOpen ? (
              <View
                style={styles.themePickerRow}
                accessibilityRole="radiogroup"
                accessibilityLabel="Choose theme"
              >
                {themeSegments.map((segment) => {
                  const active =
                    (entryTheme?.themeId ?? null) === segment.themeId;
                  return (
                    <Pressable
                      key={segment.themeId ?? 'none'}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active, disabled: themeSaving }}
                      disabled={themeSaving}
                      onPress={() => void activateTheme(segment.themeId)}
                      style={({ pressed }) => [
                        styles.themeChip,
                        {
                          borderColor: active ? colors.accent : colors.border,
                          backgroundColor: active ? colors.accentSubtle : 'transparent',
                          opacity: pressed ? 0.82 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: active ? colors.accent : colors.metaFg,
                          fontFamily: fonts.regular,
                          fontSize: 12,
                          lineHeight: 16,
                        }}
                      >
                        {segment.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  hasAssignedTheme
                    ? `Theme: ${assignedThemeLabel}. Tap to change.`
                    : 'Add theme. Tap to choose.'
                }
                onPress={() => setThemePickerOpen(true)}
                style={({ pressed }) => [
                  styles.themeChip,
                  styles.themeTrigger,
                  {
                    borderColor: hasAssignedTheme ? colors.accent : colors.border,
                    backgroundColor: hasAssignedTheme ? colors.accentSubtle : 'rgba(255,255,255,0.03)',
                    opacity: pressed ? 0.82 : 1,
                  },
                ]}
              >
                <Text
                  style={{
                    color: hasAssignedTheme ? colors.accent : colors.metaFg,
                    fontFamily: fonts.regular,
                    fontSize: 12,
                    lineHeight: 16,
                  }}
                >
                  {assignedThemeLabel}
                </Text>
              </Pressable>
            )}
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : 'fullScreen'}
      onRequestClose={handleBackdropPress}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.rootGestureHost}>
        <View testID="entry-read-sheet" style={styles.root} accessibilityViewIsModal>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.scrimLayer,
              {
                backgroundColor: scrimColor,
                opacity: combinedScrimOpacity,
              },
            ]}
          />
          <Pressable
            style={[styles.dismissRegion, isExpanded ? styles.dismissRegionHidden : null]}
            onPress={handleBackdropPress}
            accessibilityRole="button"
            accessibilityLabel={backdropA11yLabel}
            pointerEvents={isExpanded ? 'none' : 'auto'}
          />

          <PanGestureHandler
            ref={panRef}
            style={[styles.sheetPanHost, isExpanded ? styles.sheetPanHostExpanded : null]}
            simultaneousHandlers={scrollGestureRef}
            activeOffsetY={[-12, 12]}
            failOffsetX={[-24, 24]}
            onGestureEvent={onGestureEvent}
            onHandlerStateChange={onSheetPanStateChange}
          >
            <Animated.View
              testID="entry-thought-sheet"
              style={[
                styles.sheet,
                isExpanded ? styles.sheetExpanded : null,
                {
                  backgroundColor: colors.bgElevated,
                  borderColor: colors.border,
                  borderTopLeftRadius: isExpanded ? 0 : radius.lg,
                  borderTopRightRadius: isExpanded ? 0 : radius.lg,
                  borderWidth: isExpanded ? 0 : StyleSheet.hairlineWidth,
                  paddingTop: isExpanded ? insets.top : 0,
                  paddingBottom: Math.max(insets.bottom, spacing.md),
                  flex: isExpanded ? 1 : undefined,
                  height: isExpanded ? expandedSheetHeight : undefined,
                  maxHeight: isExpanded ? expandedSheetHeight : '88%',
                  marginBottom: isExpanded ? keyboardInset : 0,
                  opacity: contentOpacity,
                  transform: [{ translateY: sheetTranslateY }],
                },
              ]}
            >
              {dragStrip}

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
                      paddingBottom: spacing.lg,
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
                    editable={sheetVoicePhase !== 'listening'}
                    style={[
                      styles.bodyText,
                      styles.expandedEditor,
                      {
                        color: colors.entryBody,
                        fontFamily: body.fontFamily,
                        fontSize: SHEET_EDIT_FONT_SIZE,
                        lineHeight: SHEET_EDIT_LINE_HEIGHT,
                        letterSpacing: 0.14,
                        opacity: sheetVoicePhase === 'listening' ? 0.92 : 1,
                      },
                    ]}
                  />
                  {sheetVoiceSupported ? (
                    <SheetEditVoiceDock
                      phase={sheetVoicePhase}
                      theme={t}
                      onPress={toggleSheetVoice}
                    />
                  ) : null}
                </View>
              ) : (
                <NativeViewGestureHandler
                  ref={scrollGestureRef}
                  waitFor={panRef}
                  simultaneousHandlers={panRef}
                >
                  <GestureScrollView
                    ref={scrollRef}
                    testID="entry-read-scroll"
                    style={[styles.scroll, { maxHeight: scrollMaxHeight }]}
                    onScroll={(event) => {
                      scrollYRef.current = event.nativeEvent.contentOffset.y;
                    }}
                    scrollEventThrottle={16}
                    bounces
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
                            fontSize: SHEET_READ_FONT_SIZE,
                            lineHeight: comfortableReading
                              ? SHEET_READ_LINE_HEIGHT_COMFORTABLE
                              : SHEET_READ_LINE_HEIGHT,
                            letterSpacing: 0.14,
                          },
                        ]}
                      >
                        {draft}
                      </Text>
                    </Pressable>
                    {entry ? (
                      <ThoughtTrailRail
                        current={entry}
                        earlier={trailEarlier}
                        later={trailLater}
                        onSelect={(next) => onTrailEntrySelect?.(next)}
                      />
                    ) : null}
                  </GestureScrollView>
                </NativeViewGestureHandler>
              )}
            </Animated.View>
          </PanGestureHandler>
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
  scrimLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  dismissRegion: {
    flex: 1,
  },
  dismissRegionHidden: {
    flex: 0,
    height: 0,
  },
  sheetPanHost: {
    width: '100%',
  },
  sheetPanHostExpanded: {
    flex: 1,
  },
  sheet: {
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  sheetExpanded: {
    flexDirection: 'column',
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
  grabberZoneExpanded: {
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 8,
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
    flex: 1,
    minHeight: 0,
  },
  bodyText: {
    padding: 0,
  },
  expandedEditor: {
    flex: 1,
    minHeight: 120,
  },
  themePickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  themeChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  themeTrigger: {
    alignSelf: 'flex-start',
  },
});
