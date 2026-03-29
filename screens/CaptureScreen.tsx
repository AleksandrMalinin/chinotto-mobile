import { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmbientBackground } from '../components/AmbientBackground';
import { CaptureInput } from '../components/CaptureInput';
import { ChinottoLogo } from '../components/ChinottoLogo';
import { EnableSyncModal } from '../components/EnableSyncModal';
import { EntryReadSheet } from '../components/EntryReadSheet';
import { RecentList } from '../components/RecentList';
import { SyncHeaderStatus, type SyncHeaderAuthPhase } from '../components/SyncHeaderStatus';
import type { Entry } from '../types/entry';
import { showDevMenu } from '../dev/showDevMenu';
import {
  deleteEntry,
  getEntriesOlderThan,
  getRecentEntries,
  saveEntry,
  searchEntriesForRecall,
} from '../storage/entryRepository';
import { isFirebaseSyncConfigured } from '../sync/firebaseConfig';
import { getOrInitAuth } from '../sync/firebaseAuth';
import { getPendingSyncCount } from '../sync/syncQueue';
import { flushSyncTombstoneOutbox } from '../sync/tombstoneFlush';
import { fonts, screenContentGutter, useAppTheme } from '../theme';

/** First page size; same step for “load more”. */
const PAGE_SIZE = 20;
/** Near bottom of scroll content → fetch next page. */
const SCROLL_END_THRESHOLD_PX = 160;
const SEARCH_DEBOUNCE_MS = 250;
const SEARCH_MAX_RESULTS = 300;
/** How often to refresh upload-queue state for the sync header while signed in. */
const SYNC_UPLOAD_POLL_MS = 2500;
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
};

export function CaptureScreen({
  onDevMenu,
  remoteIngestVersion = 0,
  externalEntriesEpoch = 0,
  captureFocusNonce = 0,
  streamHighlightEntryId = null,
  onScheduleStreamHighlight,
}: CaptureScreenProps = {}) {
  const [text, setText] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [readEntry, setReadEntry] = useState<Entry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Entry[]>([]);
  const [searchTruncated, setSearchTruncated] = useState(false);
  const [authRestorePhase, setAuthRestorePhase] = useState<AuthRestorePhase>(() =>
    isFirebaseSyncConfigured() && Platform.OS === 'ios' ? 'restoring' : 'signed_out'
  );
  const [uploadPending, setUploadPending] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const entriesRef = useRef<Entry[]>([]);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const searchQueryRef = useRef('');
  const searchActiveRef = useRef(false);
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const t = useAppTheme();
  const gutter = screenContentGutter(windowWidth);

  entriesRef.current = entries;
  hasMoreRef.current = hasMore;
  searchQueryRef.current = searchQuery;
  const searchTrimmed = searchQuery.trim();
  searchActiveRef.current = searchTrimmed.length > 0;
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
      return;
    }
    let cancelled = false;
    const tick = () => {
      void getPendingSyncCount()
        .then((n) => {
          if (!cancelled) {
            setUploadPending(n > 0);
          }
        })
        .catch(() => {});
    };
    tick();
    const id = setInterval(tick, SYNC_UPLOAD_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
      setUploadPending(false);
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
      })
      .catch((err) => {
        if (__DEV__) {
          console.warn('saveEntry failed', err);
        }
      });
  }, [text, runSearch, onScheduleStreamHighlight, refreshUploadPending]);

  /** Slightly taller composer so capture reads as the primary surface. */
  const composerMinHeight = 56;
  const composerMaxHeight = 92;

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
                  onLongPress={() => showDevMenu({ onResetWelcome: onDevMenu })}
                >
                  <ChinottoLogo testID="header-logo" size={42} color={t.colors.fgDim} />
                </Pressable>
              ) : (
                <ChinottoLogo testID="header-logo" size={42} color={t.colors.fgDim} />
              )}
              {isFirebaseSyncConfigured() && Platform.OS === 'ios' ? (
                <SyncHeaderStatus
                  phase={authRestorePhase}
                  uploadPending={authRestorePhase === 'signed_in' && uploadPending}
                  onPress={() => setSyncModalVisible(true)}
                  style={styles.syncAfterLogo}
                />
              ) : null}
            </View>
          </View>
          <ScrollView
            style={styles.scrollFlex}
            keyboardShouldPersistTaps="handled"
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
              Gutter only on composer + search. Stream stays full width of the scroll view so
              row press / trace aren’t clipped inside a padded content box (see RecentList).
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
              <View style={{ marginTop: t.spacing.sm }}>
                <TextInput
                  testID="stream-search-input"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search thoughts…"
                  placeholderTextColor={t.colors.muted}
                  accessibilityLabel="Search thoughts"
                  style={{
                    fontFamily: fonts.regular,
                    fontSize: 16,
                    lineHeight: 22,
                    color: t.colors.fgDim,
                    paddingVertical: 10,
                    paddingHorizontal: 0,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: t.colors.border,
                  }}
                  keyboardAppearance={t.isDark ? 'dark' : 'light'}
                  returnKeyType="search"
                  {...(Platform.OS === 'ios' ? { clearButtonMode: 'while-editing' as const } : {})}
                />
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
            <View style={[styles.bottomFill, { flexGrow: 1, minHeight: 1 }]} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
