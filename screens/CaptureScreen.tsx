import { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  useWindowDimensions,
  View,
  type LayoutAnimationConfig,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmbientBackground } from '../components/AmbientBackground';
import { CaptureInput } from '../components/CaptureInput';
import { ChinottoLogo, chinottoLogoLeadingOutset } from '../components/ChinottoLogo';
import { EnableSyncModal } from '../components/EnableSyncModal';
import { EntryReadSheet } from '../components/EntryReadSheet';
import { RecentList } from '../components/RecentList';
import { SyncHeaderStatus, type SyncHeaderAuthPhase } from '../components/SyncHeaderStatus';
import type { Entry } from '../types/entry';
import { resetPaywallForPurchaseTesting } from '../dev/resetPaywallForPurchaseTesting';
import { showDevMenu } from '../dev/showDevMenu';
import {
  deleteEntry,
  getEntriesOlderThan,
  getRecentEntries,
  saveEntry,
  searchEntriesForRecall,
} from '../storage/entryRepository';
import { clearLocalSyncPaywallFlags } from '../monetization/subscriptionState';
import { devRevenueCatLogOutAndRefreshEntitlementCache } from '../src/services/purchases/revenueCat';
import {
  hasEnableSyncShimmerCompleted,
  hasFirstSavedThought,
  hasSyncHeaderCtaBeenTapped,
  markEnableSyncShimmerCompleted,
  recordFirstSavedThought,
  recordSyncHeaderCtaTapped,
} from '../storage/syncHeaderShimmerPrefs';
import { isFirebaseSyncConfigured } from '../sync/firebaseConfig';
import { getOrInitAuth } from '../sync/firebaseAuth';
import { getPendingSyncCount } from '../sync/syncQueue';
import { flushSyncTombstoneOutbox } from '../sync/tombstoneFlush';
import { fonts, radius, screenContentGutter, screenContentInnerPad, useAppTheme } from '../theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Light tap when the user explicitly opens or closes recall search — not on auto-collapse. */
function searchChromeHaptic() {
  if (Platform.OS === 'web') return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Calm expand/collapse for the search capsule (slightly slower than system default). */
function animateSearchLayout() {
  const config: LayoutAnimationConfig =
    Platform.OS === 'ios'
      ? LayoutAnimation.create(280, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity)
      : { duration: 240, update: { type: LayoutAnimation.Types.easeInEaseOut } };
  LayoutAnimation.configureNext(config);
}

/** First page size; same step for “load more”. */
const PAGE_SIZE = 20;
/** Near bottom of scroll content → fetch next page. */
const SCROLL_END_THRESHOLD_PX = 160;
const SEARCH_DEBOUNCE_MS = 250;
const SEARCH_MAX_RESULTS = 300;
/** How often to refresh upload-queue state for the sync header while signed in. */
const SYNC_UPLOAD_POLL_MS = 2500;
/** Pending rows at or above this count can contribute to a “stuck” header after consecutive polls. */
const SYNC_STUCK_PENDING_MIN = 5;
/** Consecutive polls (see interval) with high pending count before showing Sync paused. */
const SYNC_STUCK_CONSECUTIVE_POLLS = 3;
/** Firebase session restore vs signed-out; avoids showing Enable sync before persistence restores. */
export type AuthRestorePhase = SyncHeaderAuthPhase;

export type CaptureScreenProps = {
  /** `__DEV__` only: long-press header logo opens dev menu (e.g. reset welcome). */
  onDevMenu?: () => void;
  /** Increment when Firestore ingest applies remote changes (desktop → mobile). */
  remoteIngestVersion?: number;
  /** Increment when entries change outside this screen (e.g. system share). */
  externalEntriesEpoch?: number;
  /** Increment when the app should move focus to capture (e.g. home screen widget open). */
  captureFocusNonce?: number;
  /** Row id receiving the transient “just landed” tint (capture or share). */
  streamHighlightEntryId?: string | null;
  /** Schedule/clear handled in parent so manual capture and share share one timer. */
  onScheduleStreamHighlight?: (entryId: string) => void;
  /** From App after {@link loadSubscriptionState}; defaults true for tests / isolation. */
  subscriptionHydrated?: boolean;
  /** Stub or real Plus purchase completed — refresh Firestore ingest when paywall is on. */
  onSubscriptionUnlocked?: () => void;
};

export function CaptureScreen({
  onDevMenu,
  remoteIngestVersion = 0,
  externalEntriesEpoch = 0,
  captureFocusNonce = 0,
  streamHighlightEntryId = null,
  onScheduleStreamHighlight,
  subscriptionHydrated = true,
  onSubscriptionUnlocked,
}: CaptureScreenProps = {}) {
  const [text, setText] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [readEntry, setReadEntry] = useState<Entry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Entry[]>([]);
  const [searchTruncated, setSearchTruncated] = useState(false);
  /** Search is secondary: hidden until user opens it — avoids competing with capture. */
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [authRestorePhase, setAuthRestorePhase] = useState<AuthRestorePhase>(() =>
    isFirebaseSyncConfigured() && Platform.OS === 'ios' ? 'restoring' : 'signed_out'
  );
  const [uploadPending, setUploadPending] = useState(false);
  const [uploadStuck, setUploadStuck] = useState(false);
  const [enableSyncLabelShimmer, setEnableSyncLabelShimmer] = useState(false);
  /** __DEV__: incremented from dev menu to re-show “Sync enabled” / desktop link sheet. */
  const [devPostSyncPreviewNonce, setDevPostSyncPreviewNonce] = useState(0);
  const stuckPollsRef = useRef(0);
  const authPhaseRef = useRef(authRestorePhase);
  const enableSyncShimmerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);
  const searchInputRef = useRef<TextInput>(null);
  const searchBlurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entriesRef = useRef<Entry[]>([]);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const searchQueryRef = useRef('');
  const searchActiveRef = useRef(false);
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const t = useAppTheme();
  const gutter = screenContentGutter(windowWidth);

  authPhaseRef.current = authRestorePhase;

  entriesRef.current = entries;
  hasMoreRef.current = hasMore;
  searchQueryRef.current = searchQuery;
  const searchTrimmed = searchQuery.trim();
  searchActiveRef.current = searchTrimmed.length > 0;

  const expandSearch = useCallback(() => {
    searchChromeHaptic();
    animateSearchLayout();
    setSearchExpanded(true);
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }, []);

  const collapseSearch = useCallback(() => {
    searchChromeHaptic();
    Keyboard.dismiss();
    animateSearchLayout();
    setSearchQuery('');
    setSearchExpanded(false);
    setSearchFocused(false);
    if (searchBlurTimerRef.current) {
      clearTimeout(searchBlurTimerRef.current);
      searchBlurTimerRef.current = null;
    }
  }, []);

  const onSearchFocus = useCallback(() => {
    setSearchFocused(true);
    if (searchBlurTimerRef.current) {
      clearTimeout(searchBlurTimerRef.current);
      searchBlurTimerRef.current = null;
    }
  }, []);

  const onSearchBlur = useCallback(() => {
    setSearchFocused(false);
    if (searchBlurTimerRef.current) {
      clearTimeout(searchBlurTimerRef.current);
    }
    searchBlurTimerRef.current = setTimeout(() => {
      searchBlurTimerRef.current = null;
      if (!searchQueryRef.current.trim()) {
        animateSearchLayout();
        setSearchExpanded(false);
      }
    }, 220);
  }, []);
  /** Slightly dim the stream while composing so capture reads primary; list stays visible. */
  const streamSecondary = text.trim().length > 0;

  const runSearch = useCallback(async (q: string) => {
    try {
      const { entries: rows, truncated } = await searchEntriesForRecall(q, SEARCH_MAX_RESULTS);
      setSearchResults(rows);
      setSearchTruncated(truncated);
    } catch (err) {
      if (__DEV__) {
        console.warn('searchEntriesForRecall failed', err);
      }
    }
  }, []);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearchTruncated(false);
      return;
    }
    const id = setTimeout(() => {
      void runSearch(trimmed);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [searchQuery, runSearch]);

  useEffect(() => {
    const q = searchQueryRef.current.trim();
    if (!q) {
      return;
    }
    void runSearch(q);
  }, [remoteIngestVersion, externalEntriesEpoch, runSearch]);

  const refreshEntries = useCallback(async () => {
    try {
      const targetCount = Math.max(PAGE_SIZE, entriesRef.current.length);
      const batch = await getRecentEntries(targetCount + 1);
      setHasMore(batch.length > targetCount);
      setEntries(batch.slice(0, targetCount));
    } catch (err) {
      if (__DEV__) {
        console.warn('refreshEntries failed', err);
      }
    }
  }, []);

  useEffect(() => {
    void refreshEntries();
  }, [refreshEntries, remoteIngestVersion, externalEntriesEpoch]);

  useEffect(() => {
    if (!captureFocusNonce) {
      return;
    }
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [captureFocusNonce]);

  useEffect(
    () => () => {
      if (enableSyncShimmerTimerRef.current) {
        clearTimeout(enableSyncShimmerTimerRef.current);
        enableSyncShimmerTimerRef.current = null;
      }
    },
    []
  );

  useEffect(() => {
    if (!isFirebaseSyncConfigured() || Platform.OS !== 'ios') {
      return;
    }

    if (__DEV__) {
      console.log('[ChinottoAuth] launch: attaching auth listener', { platform: Platform.OS });
    }

    const auth = getOrInitAuth();

    if (__DEV__) {
      const u = auth.currentUser;
      console.log('[ChinottoAuth] auth init: immediate currentUser', {
        uid: u?.uid ?? null,
        isAnonymous: u?.isAnonymous ?? null,
        providerIds: u?.providerData?.map((p) => p.providerId) ?? [],
      });
    }

    return onAuthStateChanged(auth, (user) => {
      const syncEnabled = Boolean(user && !user.isAnonymous);
      const nextPhase: AuthRestorePhase = syncEnabled ? 'signed_in' : 'signed_out';

      if (__DEV__) {
        console.log('[ChinottoAuth] onAuthStateChanged', {
          uid: user?.uid ?? null,
          isAnonymous: user?.isAnonymous ?? null,
          providerIds: user?.providerData?.map((p) => p.providerId) ?? [],
        });
        console.log('[ChinottoAuth] sync UI decision', {
          phase: nextPhase,
          treatAsSyncEnabled: syncEnabled,
        });
      }

      setAuthRestorePhase(nextPhase);
    });
  }, []);

  const refreshUploadPending = useCallback(async () => {
    if (!isFirebaseSyncConfigured() || Platform.OS !== 'ios' || authRestorePhase !== 'signed_in') {
      return;
    }
    try {
      const n = await getPendingSyncCount();
      setUploadPending(n > 0);
    } catch {
      /* ignore */
    }
  }, [authRestorePhase]);

  useEffect(() => {
    if (!isFirebaseSyncConfigured() || Platform.OS !== 'ios') {
      return;
    }
    if (authRestorePhase !== 'signed_in') {
      setUploadPending(false);
      setUploadStuck(false);
      stuckPollsRef.current = 0;
      return;
    }
    let cancelled = false;
    const tick = () => {
      void getPendingSyncCount()
        .then((n) => {
          if (cancelled) {
            return;
          }
          setUploadPending(n > 0);
          if (n >= SYNC_STUCK_PENDING_MIN) {
            stuckPollsRef.current += 1;
            if (stuckPollsRef.current >= SYNC_STUCK_CONSECUTIVE_POLLS) {
              setUploadStuck(true);
            }
          } else {
            stuckPollsRef.current = 0;
            setUploadStuck(false);
          }
        })
        .catch(() => {});
    };
    stuckPollsRef.current = 0;
    setUploadStuck(false);
    tick();
    const id = setInterval(tick, SYNC_UPLOAD_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
      setUploadPending(false);
      setUploadStuck(false);
      stuckPollsRef.current = 0;
    };
  }, [authRestorePhase]);

  /** Optimistic UI: row disappears immediately; SQLite + tombstone outbox stay non-blocking. */
  const handleEntryDelete = useCallback((entry: Entry) => {
    setReadEntry((current) => (current?.id === entry.id ? null : current));
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    setSearchResults((prev) => prev.filter((e) => e.id !== entry.id));
    void deleteEntry(entry.id)
      .then(() => {
        void flushSyncTombstoneOutbox();
        void refreshUploadPending();
      })
      .catch((err) => {
        if (__DEV__) {
          console.warn('deleteEntry failed', err);
        }
        void refreshEntries();
      });
  }, [refreshEntries, refreshUploadPending]);

  /**
   * One delayed shimmer after the first successful save (AsyncStorage), if the user never opened
   * the sync CTA and the animation has not run before. If auth is still “restoring” when the timer
   * fires, the sweep is skipped (calm; rare edge — user may already be ineligible on next save).
   */
  const scheduleEnableSyncLabelShimmerAfterFirstSave = useCallback(() => {
    void (async () => {
      if (!isFirebaseSyncConfigured() || Platform.OS !== 'ios') {
        return;
      }
      if (enableSyncShimmerTimerRef.current !== null) {
        return;
      }
      if (await hasSyncHeaderCtaBeenTapped()) {
        return;
      }
      if (await hasEnableSyncShimmerCompleted()) {
        return;
      }
      if (await hasFirstSavedThought()) {
        return;
      }
      await recordFirstSavedThought();
      if (enableSyncShimmerTimerRef.current !== null) {
        return;
      }
      if (await hasSyncHeaderCtaBeenTapped()) {
        return;
      }
      const delayMs = 1000 + Math.random() * 1000;
      enableSyncShimmerTimerRef.current = setTimeout(() => {
        enableSyncShimmerTimerRef.current = null;
        void (async () => {
          if (await hasSyncHeaderCtaBeenTapped()) {
            return;
          }
          if (await hasEnableSyncShimmerCompleted()) {
            return;
          }
          if (authPhaseRef.current !== 'signed_out') {
            return;
          }
          setEnableSyncLabelShimmer(true);
        })();
      }, delayMs);
    })();
  }, []);

  const openSyncModalFromHeader = useCallback(() => {
    void recordSyncHeaderCtaTapped();
    if (enableSyncShimmerTimerRef.current) {
      clearTimeout(enableSyncShimmerTimerRef.current);
      enableSyncShimmerTimerRef.current = null;
    }
    setEnableSyncLabelShimmer(false);
    setSyncModalVisible(true);
  }, []);

  const onEnableSyncLabelShimmerComplete = useCallback(() => {
    setEnableSyncLabelShimmer(false);
    void markEnableSyncShimmerCompleted();
  }, []);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;

    if (searchActiveRef.current) {
      return;
    }
    if (!hasMoreRef.current || loadingMoreRef.current) {
      return;
    }
    if (layoutMeasurement.height + contentOffset.y < contentSize.height - SCROLL_END_THRESHOLD_PX) {
      return;
    }

    const list = entriesRef.current;
    if (list.length === 0) {
      return;
    }

    loadingMoreRef.current = true;
    const last = list[list.length - 1];
    void (async () => {
      try {
        const batch = await getEntriesOlderThan(last, PAGE_SIZE + 1);
        const more = batch.length > PAGE_SIZE;
        const page = batch.slice(0, PAGE_SIZE);
        setEntries((prev) => {
          const ids = new Set(prev.map((x) => x.id));
          const merged = page.filter((row) => !ids.has(row.id));
          return [...prev, ...merged];
        });
        setHasMore(more);
      } catch (err) {
        if (__DEV__) {
          console.warn('getEntriesOlderThan failed', err);
        }
      } finally {
        loadingMoreRef.current = false;
      }
    })();
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    void saveEntry(trimmed)
      .then((entry) => {
        setText('');
        requestAnimationFrame(() => {
          inputRef.current?.focus();
        });
        setEntries((prev) => [entry, ...prev.filter((e) => e.id !== entry.id)]);
        onScheduleStreamHighlight?.(entry.id);
        const sq = searchQueryRef.current.trim();
        if (sq) {
          void runSearch(sq);
        }
        void refreshUploadPending();
        scheduleEnableSyncLabelShimmerAfterFirstSave();
      })
      .catch((err) => {
        if (__DEV__) {
          console.warn('saveEntry failed', err);
        }
      });
  }, [
    text,
    runSearch,
    onScheduleStreamHighlight,
    refreshUploadPending,
    scheduleEnableSyncLabelShimmerAfterFirstSave,
  ]);

  /** Taller composer so capture reads clearly as the primary surface on device. */
  const composerMinHeight = 76;
  const composerMaxHeight = 120;
  /** Search stays a quiet utility strip — not a second “composer” (no accent fill until focused). */
  const searchIdleSurface = t.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)';
  const headerLogoSize = 42;
  /** Ring geometry: align **outer ring** with search field (gutter only); composer is inset +`screenContentInnerPad`. */
  const headerLogoAlignStyle = { marginLeft: -chinottoLogoLeadingOutset(headerLogoSize) };

  return (
    <View style={styles.shell}>
      <AmbientBackground />
      <SafeAreaView style={styles.safe} edges={['top', 'right', 'left', 'bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            style={[
              styles.headerBar,
              {
                paddingHorizontal: gutter,
                paddingTop: t.spacing.xs,
                marginBottom: t.spacing.sm,
              },
            ]}
          >
            <View
              style={[
                styles.headerLogoSlot,
                isFirebaseSyncConfigured() && Platform.OS === 'ios' && styles.headerReserveDevMenuTray,
              ]}
            >
              {onDevMenu != null ? (
                <Pressable
                  accessibilityLabel="Chinotto"
                  accessibilityHint="Long press opens developer menu"
                  delayLongPress={450}
                  hitSlop={12}
                  onLongPress={() =>
                    showDevMenu({
                      onResetWelcome: onDevMenu,
                      ...(__DEV__ && Platform.OS === 'ios'
                        ? {
                            onClearLocalSyncPaywallFlags: () => void clearLocalSyncPaywallFlags(),
                            onRevenueCatLogOut: () => void devRevenueCatLogOutAndRefreshEntitlementCache(),
                            onResetPaywallForPurchaseTesting: () => void resetPaywallForPurchaseTesting(),
                            onPreviewSyncEnabledSheet: () => {
                              setDevPostSyncPreviewNonce((n) => n + 1);
                              setSyncModalVisible(true);
                            },
                          }
                        : {}),
                    })
                  }
                >
                  <ChinottoLogo
                    testID="header-logo"
                    size={headerLogoSize}
                    color={t.colors.fgDim}
                    style={headerLogoAlignStyle}
                  />
                </Pressable>
              ) : (
                <ChinottoLogo
                  testID="header-logo"
                  size={headerLogoSize}
                  color={t.colors.fgDim}
                  style={headerLogoAlignStyle}
                />
              )}
              {isFirebaseSyncConfigured() && Platform.OS === 'ios' ? (
                <SyncHeaderStatus
                  phase={authRestorePhase}
                  uploadPending={authRestorePhase === 'signed_in' && uploadPending}
                  uploadStuck={authRestorePhase === 'signed_in' && uploadStuck}
                  onPress={openSyncModalFromHeader}
                  enableSyncLabelShimmer={enableSyncLabelShimmer}
                  onEnableSyncLabelShimmerComplete={onEnableSyncLabelShimmerComplete}
                  style={styles.syncAfterLogo}
                />
              ) : null}
            </View>
          </View>
          <ScrollView
            style={styles.scrollFlex}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            nestedScrollEnabled
            scrollEventThrottle={16}
            onScroll={handleScroll}
            contentContainerStyle={[
              styles.scrollContent,
              {
                flexGrow: 1,
                minHeight: windowHeight,
              },
            ]}
          >
            {/*
              Gutter on composer + search affordance. Stream stays full width (see RecentList).
            */}
            <View style={{ paddingHorizontal: gutter }}>
              <View style={styles.composerBlock}>
                <CaptureInput
                  ref={inputRef}
                  value={text}
                  onChangeText={setText}
                  onSubmit={handleSubmit}
                  minHeight={composerMinHeight}
                  maxHeight={composerMaxHeight}
                  placeholder="Write a thought…"
                  placeholderTextColor={t.colors.metaFg}
                />
              </View>
              <View style={{ marginTop: t.spacing.lg }}>
                {searchExpanded ? (
                  <View
                    style={[
                      styles.searchPill,
                      styles.searchPillExpanded,
                      {
                        backgroundColor: searchFocused ? t.colors.accentSubtle : searchIdleSurface,
                        borderColor: searchFocused ? t.colors.borderFocus : t.colors.border,
                      },
                    ]}
                  >
                    <Ionicons name="search" size={15} color={t.colors.sectionFg} style={styles.searchPillIcon} />
                    <TextInput
                      ref={searchInputRef}
                      testID="stream-search-input"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      onFocus={onSearchFocus}
                      onBlur={onSearchBlur}
                      placeholder="Find in stream…"
                      placeholderTextColor={t.colors.sectionFg}
                      accessibilityLabel="Find in stream"
                      style={[
                        styles.searchFieldExpanded,
                        {
                          fontFamily: fonts.regular,
                          color: t.colors.fgDim,
                        },
                      ]}
                      keyboardAppearance={t.isDark ? 'dark' : 'light'}
                      returnKeyType="search"
                      selectionColor={t.colors.accent}
                      {...(Platform.OS === 'ios' ? { clearButtonMode: 'while-editing' as const } : {})}
                    />
                    <Pressable
                      testID="stream-search-collapse"
                      accessibilityLabel="Close search"
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={collapseSearch}
                      style={({ pressed }) => [
                        styles.searchCloseOrb,
                        {
                          backgroundColor: pressed ? t.colors.accentSubtle : 'transparent',
                        },
                      ]}
                    >
                      <Ionicons name="close" size={18} color={t.colors.metaFg} />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    testID="stream-search-toggle"
                    accessibilityLabel="Find in stream"
                    accessibilityRole="button"
                    onPress={expandSearch}
                    style={({ pressed }) => [
                      styles.searchPill,
                      styles.searchPillCollapsed,
                      {
                        backgroundColor: searchIdleSurface,
                        borderColor: t.colors.border,
                        opacity: pressed ? 0.92 : 1,
                      },
                    ]}
                    android_ripple={{ color: 'rgba(255,255,255,0.06)', borderless: false }}
                  >
                    <Ionicons name="search" size={15} color={t.colors.sectionFg} style={styles.searchPillIcon} />
                    <Text
                      style={[
                        styles.searchPillHint,
                        {
                          color: t.colors.sectionFg,
                          fontFamily: fonts.regular,
                          fontSize: t.typography.meta.fontSize,
                          lineHeight: 18,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      Find in stream…
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
            <View style={{ opacity: streamSecondary ? 0.64 : 1 }}>
              <RecentList
                entries={searchTrimmed.length > 0 ? searchResults : entries}
                visible
                highlightEntryId={searchTrimmed.length > 0 ? null : streamHighlightEntryId}
                emptyHint={
                  searchTrimmed.length > 0
                    ? 'Nothing matches that search.'
                    : entries.length === 0
                      ? 'Nothing here yet.'
                      : undefined
                }
                listFooterHint={
                  searchTrimmed.length > 0 && searchTruncated
                    ? `Showing first ${SEARCH_MAX_RESULTS} matches`
                    : undefined
                }
                onEntryPress={setReadEntry}
                onEntryDelete={handleEntryDelete}
              />
            </View>
            <Pressable
              style={[styles.bottomFill, { flexGrow: 1, minHeight: 1 }]}
              accessible={false}
              onPress={Keyboard.dismiss}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      {/* Enable sync sheet: opened only from the header CTA. Paid step uses monetization/syncPurchaseFlow when EXPO_PUBLIC_ENABLE_PAYWALL=true. */}
      <EnableSyncModal
        visible={syncModalVisible}
        onClose={() => setSyncModalVisible(false)}
        onEnabled={() => {
          setAuthRestorePhase('signed_in');
          void getPendingSyncCount()
            .then((n) => setUploadPending(n > 0))
            .catch(() => {});
        }}
        authPhase={authRestorePhase}
        subscriptionHydrated={subscriptionHydrated}
        onSubscriptionUnlocked={onSubscriptionUnlocked}
        devPostSyncPreviewNonce={
          __DEV__ && devPostSyncPreviewNonce > 0 ? devPostSyncPreviewNonce : undefined
        }
        syncHealthNote={
          authRestorePhase === 'signed_in' && uploadStuck
            ? 'Uploads are waiting—check your connection. Nothing is lost; thoughts stay on this device.'
            : null
        }
        fg={t.colors.fg}
        fgDim={t.colors.fgDim}
        muted={t.colors.muted}
        bgElevated={t.colors.bgElevated}
        border={t.colors.border}
      />
      <EntryReadSheet
        visible={readEntry != null}
        entry={readEntry}
        onClose={() => setReadEntry(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  flex: { flex: 1 },
  scrollFlex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
  },
  headerLogoSlot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
  },
  /** When Sync is shown, keep the top-trailing corner clear for expo-dev-client’s floating menu. */
  headerReserveDevMenuTray: {
    paddingRight: 56,
  },
  syncAfterLogo: {
    marginLeft: 14,
    paddingVertical: 6,
    paddingRight: 4,
  },
  bottomFill: {},
  /** No fill — only rhythm; capture reads against AmbientBackground. */
  composerBlock: {
    paddingHorizontal: screenContentInnerPad,
    paddingVertical: 14,
  },
  /** Full-width capsule — metadata scale; reads as chrome, not a second composer. */
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    minHeight: 40,
  },
  searchPillCollapsed: {
    paddingLeft: 12,
    paddingRight: 14,
    paddingVertical: 10,
  },
  searchPillExpanded: {
    paddingLeft: 12,
  },
  searchPillIcon: {
    marginRight: 8,
  },
  searchPillHint: {
    flex: 1,
    letterSpacing: 0.2,
  },
  searchFieldExpanded: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    paddingRight: 8,
    margin: 0,
    minWidth: 0,
  },
  searchCloseOrb: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
    marginVertical: 4,
  },
});
