import { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  Alert,
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
import { VoiceMicButton } from '../components/VoiceCaptureControl';
import { AppIconScreen } from './AppIconScreen';
import { ManifestoScreen } from './ManifestoScreen';
import { SettingsScreen } from './SettingsScreen';
import { ENABLE_APP_ICON_SWITCHER } from '../src/features/flags';
import type { ScreenshotScene } from '../src/features/screenshotMode';
import { mergeVoiceTranscript } from '../src/features/voiceCapture/mergeVoiceTranscript';
import { useVoiceCapture } from '../src/features/voiceCapture/useVoiceCapture';
import { SCREENSHOT_DEMO_COMPOSER_TEXT, SCREENSHOT_DEMO_ENTRIES } from '../src/screenshots/demoEntries';
import {
  getCurrentAppIconVariantId,
  setCurrentAppIconVariantId,
  supportsDynamicAppIcons,
} from '../src/services/icons/appIcon';
import { getAppIconVariant, type AppIconVariantId } from '../src/services/icons/iconVariants';
import type { Entry } from '../types/entry';
import { resetPaywallForPurchaseTesting } from '../dev/resetPaywallForPurchaseTesting';
import { showDevMenu } from '../dev/showDevMenu';
import {
  clearFirstLaunchEmptyCaptureRevealDone,
  getFirstLaunchComposerHasFocused,
  getFirstLaunchEmptyCaptureRevealDone,
  setFirstLaunchComposerHasFocused,
  setFirstLaunchEmptyCaptureRevealDone,
} from '../storage/firstLaunchCapturePrefs';
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
import { getHapticsEnabled, setHapticsEnabled } from '../storage/settingsPrefs';
import { isFirebaseSyncConfigured } from '../sync/firebaseConfig';
import { getOrInitAuth } from '../sync/firebaseAuth';
import { getPendingSyncCount } from '../sync/syncQueue';
import { mirrorChinottoSyncAccessToFirestore } from '../sync/firestoreSyncAccessMirror';
import { flushSyncTombstoneOutbox } from '../sync/tombstoneFlush';
import { fonts, radius, screenContentGutter, screenContentInnerPad, useAppTheme } from '../theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
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
type SettingsRoute = 'settings' | 'manifesto' | 'app_icon';

/** How often to refresh upload-queue state for the sync header while signed in. */
const SYNC_UPLOAD_POLL_MS = 2500;
/** Pending rows at or above this count can contribute to a “stuck” header after consecutive polls. */
const SYNC_STUCK_PENDING_MIN = 5;
/** Consecutive polls (see interval) with high pending count before showing Sync paused. */
const SYNC_STUCK_CONSECUTIVE_POLLS = 3;
/** Firebase session restore vs signed-out; avoids showing Enable sync before persistence restores. */
export type AuthRestorePhase = SyncHeaderAuthPhase;

export type CaptureScreenshotConfig = {
  scene: ScreenshotScene;
};

export type CaptureScreenProps = {
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
  /**
   * Increment (from universal link / custom scheme) to open the same sync sheet as the header CTA,
   * without recording a header “tap” for shimmer prefs.
   */
  syncEntryRequestNonce?: number;
  /** App Store / marketing: deterministic stream + instant scene switching via deep link. */
  screenshot?: CaptureScreenshotConfig;
  /**
   * When false, the composer does not auto-focus (e.g. while the brand splash fades over capture).
   * App sets this to true once the splash overlay is removed.
   */
  allowCaptureFocus?: boolean;
  /**
   * When set with {@link onSyncModalVisibleChange}, the Enable sync sheet is controlled by the parent
   * so Firestore ingest can pause while the sheet is open.
   */
  syncModalVisible?: boolean;
  onSyncModalVisibleChange?: (visible: boolean) => void;
};

export function CaptureScreen({
  remoteIngestVersion = 0,
  externalEntriesEpoch = 0,
  captureFocusNonce = 0,
  streamHighlightEntryId = null,
  onScheduleStreamHighlight,
  subscriptionHydrated = true,
  onSubscriptionUnlocked,
  syncEntryRequestNonce = 0,
  screenshot,
  allowCaptureFocus = true,
  syncModalVisible: syncModalVisibleProp,
  onSyncModalVisibleChange,
}: CaptureScreenProps = {}) {
  const [text, setText] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [syncModalVisibleInternal, setSyncModalVisibleInternal] = useState(false);
  const syncModalControlled = onSyncModalVisibleChange != null;
  const syncModalVisible = syncModalControlled ? Boolean(syncModalVisibleProp) : syncModalVisibleInternal;
  const setSyncModalVisible = useCallback(
    (next: boolean) => {
      if (syncModalControlled) {
        onSyncModalVisibleChange!(next);
      } else {
        setSyncModalVisibleInternal(next);
      }
    },
    [syncModalControlled, onSyncModalVisibleChange]
  );
  const [readEntry, setReadEntry] = useState<Entry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Entry[]>([]);
  const [searchTruncated, setSearchTruncated] = useState(false);
  /** Search is secondary: hidden until user opens it — avoids competing with capture. */
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [settingsRoute, setSettingsRoute] = useState<SettingsRoute | null>(null);
  const [appIconVariantId, setAppIconVariantId] = useState<AppIconVariantId>('default');
  const [hapticsEnabled, setHapticsEnabledState] = useState(true);
  const [authRestorePhase, setAuthRestorePhase] = useState<AuthRestorePhase>(() =>
    isFirebaseSyncConfigured() && Platform.OS === 'ios' ? 'restoring' : 'signed_out'
  );
  const [uploadPending, setUploadPending] = useState(false);
  const [uploadStuck, setUploadStuck] = useState(false);
  const [enableSyncLabelShimmer, setEnableSyncLabelShimmer] = useState(false);
  /** __DEV__: incremented from dev menu to re-show “Sync enabled” / desktop link sheet. */
  const [devPostSyncPreviewNonce, setDevPostSyncPreviewNonce] = useState(0);
  const stuckPollsRef = useRef(0);
  const lastSyncEntryNonceRef = useRef(0);
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
  /** Composer snapshot when mic starts; partials/final merge with this so live text does not stack. */
  const voiceCaptureBaseRef = useRef('');
  /** `null` until AsyncStorage resolves; drives one-time empty-stream reveal + keyboard policy. */
  const [firstLaunchRevealDone, setFirstLaunchRevealDone] = useState<boolean | null>(null);
  /** `null` until prefs load; when false, empty stream never auto-opens keyboard until user taps composer. */
  const [composerHasFocusedOnce, setComposerHasFocusedOnce] = useState<boolean | null>(null);
  /** __DEV__: incremented when dev menu clears first-launch flag so focus effect re-runs without app restart. */
  const [firstLaunchRevealDevResetNonce, setFirstLaunchRevealDevResetNonce] = useState(0);
  /** When true, splash handoff has not yet applied composer focus for this `allowCaptureFocus` session. */
  const splashFocusPendingRef = useRef(true);
  const firstLaunchFocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Bumps on dev reset so a late resolve from the mount-time prefs read cannot overwrite cleared state. */
  const firstLaunchPrefsLoadGenerationRef = useRef(0);
  const { width: windowWidth } = useWindowDimensions();
  const t = useAppTheme();
  const gutter = screenContentGutter(windowWidth);

  const screenshotActive = screenshot != null;
  const screenshotScene = screenshot?.scene;
  const screenshotActiveRef = useRef(screenshotActive);
  screenshotActiveRef.current = screenshotActive;
  /** Stable “marketing” sync header while real Firebase may still be restoring. */
  const headerAuthPhase: AuthRestorePhase = screenshotActive ? 'signed_out' : authRestorePhase;

  authPhaseRef.current = authRestorePhase;

  entriesRef.current = entries;
  hasMoreRef.current = hasMore;
  searchQueryRef.current = searchQuery;
  const searchTrimmed = searchQuery.trim();
  searchActiveRef.current = searchTrimmed.length > 0;

  useEffect(() => {
    void getHapticsEnabled().then(setHapticsEnabledState);
  }, []);

  useEffect(() => {
    if (!ENABLE_APP_ICON_SWITCHER) {
      return;
    }
    void getCurrentAppIconVariantId().then(setAppIconVariantId);
  }, []);

  const persistHapticsEnabled = useCallback((next: boolean) => {
    setHapticsEnabledState(next);
    void setHapticsEnabled(next);
  }, []);

  const playSearchChromeHaptic = useCallback(() => {
    if (!hapticsEnabled || Platform.OS === 'web') return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [hapticsEnabled]);

  /** After a thought is persisted and merged into local state — not on keypress or failed save. */
  const playThoughtSavedHaptic = useCallback(async () => {
    if (!hapticsEnabled || Platform.OS === 'web') return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [hapticsEnabled]);

  const expandSearch = useCallback(() => {
    playSearchChromeHaptic();
    animateSearchLayout();
    setSearchExpanded(true);
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }, [playSearchChromeHaptic]);

  const collapseSearch = useCallback(() => {
    playSearchChromeHaptic();
    Keyboard.dismiss();
    animateSearchLayout();
    setSearchQuery('');
    setSearchExpanded(false);
    setSearchFocused(false);
    if (searchBlurTimerRef.current) {
      clearTimeout(searchBlurTimerRef.current);
      searchBlurTimerRef.current = null;
    }
  }, [playSearchChromeHaptic]);

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
    if (screenshotActive) {
      return;
    }
    void refreshEntries();
  }, [refreshEntries, remoteIngestVersion, externalEntriesEpoch, screenshotActive]);

  /** Empty stream — nothing to recall; clear search so UI never offers find-in-stream alone. */
  useEffect(() => {
    if (entries.length > 0) {
      return;
    }
    if (!searchExpanded && searchQuery.trim() === '') {
      return;
    }
    collapseSearch();
  }, [entries.length, searchExpanded, searchQuery, collapseSearch]);

  useEffect(() => {
    if (!screenshotActive) {
      return;
    }
    setEntries(SCREENSHOT_DEMO_ENTRIES);
    setHasMore(false);
    setSearchQuery('');
    setSearchResults([]);
    setSearchExpanded(false);
  }, [screenshotActive]);

  useEffect(() => {
    if (!screenshotActive || screenshotScene == null) {
      return;
    }
    setSettingsRoute(null);
    setSyncModalVisible(false);
    if (screenshotScene === 'settings') {
      setSettingsRoute('settings');
    }
    if (screenshotScene === 'sync' || screenshotScene === 'sync_apple') {
      setSyncModalVisible(true);
    }
  }, [screenshotActive, screenshotScene]);

  useEffect(() => {
    if (!screenshotActive) {
      return;
    }
    if (screenshotScene !== 'capture') {
      Keyboard.dismiss();
    }
  }, [screenshotActive, screenshotScene]);

  useEffect(() => {
    if (!screenshotActive || screenshotScene !== 'capture') {
      return;
    }
    const line = SCREENSHOT_DEMO_COMPOSER_TEXT.trim();
    if (line !== '') {
      setText(line);
    }
  }, [screenshotActive, screenshotScene]);

  useEffect(() => {
    const gen = firstLaunchPrefsLoadGenerationRef.current;
    void Promise.all([
      getFirstLaunchEmptyCaptureRevealDone(),
      getFirstLaunchComposerHasFocused(),
    ]).then(([revealDone, composerFocused]) => {
      if (firstLaunchPrefsLoadGenerationRef.current !== gen) {
        return;
      }
      setFirstLaunchRevealDone(revealDone);
      setComposerHasFocusedOnce((prev) => (prev === true ? true : composerFocused));
    });
  }, []);

  useEffect(() => {
    if (!captureFocusNonce || screenshotActive) {
      return;
    }
    if (firstLaunchFocusTimerRef.current) {
      clearTimeout(firstLaunchFocusTimerRef.current);
      firstLaunchFocusTimerRef.current = null;
    }
    splashFocusPendingRef.current = false;
    void setFirstLaunchEmptyCaptureRevealDone();
    void setFirstLaunchComposerHasFocused();
    setFirstLaunchRevealDone(true);
    setComposerHasFocusedOnce(true);
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [captureFocusNonce, screenshotActive]);

  useEffect(() => {
    if (!allowCaptureFocus || screenshotActive) {
      if (firstLaunchFocusTimerRef.current) {
        clearTimeout(firstLaunchFocusTimerRef.current);
        firstLaunchFocusTimerRef.current = null;
      }
      splashFocusPendingRef.current = true;
      return;
    }
    if (firstLaunchRevealDone === null) {
      return;
    }
    if (!splashFocusPendingRef.current) {
      return;
    }

    const finishSplashFocus = () => {
      splashFocusPendingRef.current = false;
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    };

    const shouldDeferEmptyKeyboard =
      entries.length === 0 &&
      (firstLaunchRevealDone !== true || !composerHasFocusedOnce);

    if (firstLaunchRevealDone === true) {
      if (shouldDeferEmptyKeyboard) {
        splashFocusPendingRef.current = false;
        return;
      }
      finishSplashFocus();
      return;
    }

    if (entries.length > 0) {
      void setFirstLaunchEmptyCaptureRevealDone();
      setFirstLaunchRevealDone(true);
      finishSplashFocus();
      return;
    }

    void setFirstLaunchEmptyCaptureRevealDone();
    setFirstLaunchRevealDone(true);
    splashFocusPendingRef.current = false;
  }, [
    allowCaptureFocus,
    screenshotActive,
    firstLaunchRevealDone,
    composerHasFocusedOnce,
    entries.length,
    firstLaunchRevealDevResetNonce,
  ]);

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
      if (screenshotActiveRef.current) {
        return;
      }
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
      void mirrorChinottoSyncAccessToFirestore();
    });
  }, []);

  /**
   * After {@link loadSubscriptionState} (RevenueCat + AsyncStorage), `hasSyncAccess()` can flip from
   * false → true while Firebase auth is unchanged. The auth listener does not re-fire, but desktop
   * reads `users/{uid}.chinottoSyncAccess` — re-mirror so we do not leave `active: false` from an
   * early boot race (auth callback before subscription hydration when paywall is on).
   * Require `signed_in` so we do not rely on ordering vs {@link App} post-hydration mirror alone.
   */
  useEffect(() => {
    if (!isFirebaseSyncConfigured() || Platform.OS !== 'ios') {
      return;
    }
    if (!subscriptionHydrated || authRestorePhase !== 'signed_in') {
      return;
    }
    void mirrorChinottoSyncAccessToFirestore();
  }, [subscriptionHydrated, authRestorePhase]);

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
    if (screenshotActive) {
      return;
    }
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
  }, [authRestorePhase, screenshotActive]);

  /** Optimistic UI: row disappears immediately; SQLite + tombstone outbox stay non-blocking. */
  const handleEntryDelete = useCallback((entry: Entry) => {
    setReadEntry((current) => (current?.id === entry.id ? null : current));
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    setSearchResults((prev) => prev.filter((e) => e.id !== entry.id));
    if (screenshotActive) {
      return;
    }
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
  }, [refreshEntries, refreshUploadPending, screenshotActive]);

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

  const openDevMenuFromSettings = useCallback(() => {
    if (!__DEV__ || Platform.OS !== 'ios') {
      return;
    }
    showDevMenu({
      onClearLocalSyncPaywallFlags: () => void clearLocalSyncPaywallFlags(),
      onRevenueCatLogOut: () => void devRevenueCatLogOutAndRefreshEntitlementCache(),
      onResetPaywallForPurchaseTesting: () => void resetPaywallForPurchaseTesting(),
      onPreviewSyncEnabledSheet: () => {
        setDevPostSyncPreviewNonce((n) => n + 1);
        setSyncModalVisible(true);
      },
      onResetFirstLaunchEmptyCaptureReveal: () => {
        Keyboard.dismiss();
        if (firstLaunchFocusTimerRef.current) {
          clearTimeout(firstLaunchFocusTimerRef.current);
          firstLaunchFocusTimerRef.current = null;
        }
        firstLaunchPrefsLoadGenerationRef.current += 1;
        splashFocusPendingRef.current = true;
        void (async () => {
          await clearFirstLaunchEmptyCaptureRevealDone();
          setFirstLaunchRevealDone(false);
          setComposerHasFocusedOnce(false);
          setFirstLaunchRevealDevResetNonce((n) => n + 1);
        })();
      },
    });
  }, []);

  useEffect(() => {
    if (syncEntryRequestNonce <= lastSyncEntryNonceRef.current) {
      return;
    }
    lastSyncEntryNonceRef.current = syncEntryRequestNonce;
    if (enableSyncShimmerTimerRef.current) {
      clearTimeout(enableSyncShimmerTimerRef.current);
      enableSyncShimmerTimerRef.current = null;
    }
    setEnableSyncLabelShimmer(false);
    setSyncModalVisible(true);
  }, [syncEntryRequestNonce]);

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

  const onVoiceTranscriptPartial = useCallback(
    (partial: string) => {
      if (screenshotActive) {
        return;
      }
      setText(mergeVoiceTranscript(voiceCaptureBaseRef.current, partial));
    },
    [screenshotActive],
  );

  const onVoiceTranscriptFinal = useCallback(
    (spoken: string, _reason: string) => {
      if (screenshotActive) {
        return;
      }
      setText(mergeVoiceTranscript(voiceCaptureBaseRef.current, spoken));
      if (hapticsEnabled) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [hapticsEnabled, screenshotActive],
  );

  const {
    phase: voicePhase,
    start: startVoiceCaptureSession,
    stop: stopVoiceCaptureSession,
    supported: voiceCaptureNativeReady,
  } = useVoiceCapture({
    onTranscriptPartial: onVoiceTranscriptPartial,
    onTranscriptFinal: onVoiceTranscriptFinal,
  });

  const showVoiceCapture = voiceCaptureNativeReady && !screenshotActive;

  /** Empty-stream art fades while the user composes so capture stays visually primary. */
  const streamEmptyAmbientSuppressed =
    text.trim().length > 0 || voicePhase === 'listening';

  /**
   * Empty stream: no auto keyboard until reveal prefs allow it and the user has focused the composer once
   * (first install stays tap-to-type; later opens can be capture-first).
   */
  const deferKeyboardForFirstLaunchReveal =
    entries.length === 0 && (firstLaunchRevealDone !== true || !composerHasFocusedOnce);

  const onCaptureComposerFocus = useCallback(() => {
    if (composerHasFocusedOnce) {
      return;
    }
    void setFirstLaunchComposerHasFocused();
    setComposerHasFocusedOnce(true);
  }, [composerHasFocusedOnce]);

  const handleSubmit = useCallback(() => {
    if (screenshotActive) {
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    void saveEntry(trimmed)
      .then(async (entry) => {
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
        await playThoughtSavedHaptic();
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
    screenshotActive,
    playThoughtSavedHaptic,
  ]);

  /** Taller composer so capture reads clearly as the primary surface on device. */
  const composerMinHeight = 76;
  const composerMaxHeight = 120;
  /** Search: default dark whisper; sunlight = spec tokens (surface / border / placeholder). */
  const searchSurface = t.sunlightMode
    ? t.colors.surfaceSearch
    : t.isDark
      ? 'rgba(255,255,255,0.015)'
      : 'rgba(0,0,0,0.02)';
  const searchBorderIdle = t.colors.searchBorder;
  const searchBorderFocus = t.sunlightMode
    ? t.colors.searchBorder
    : t.isDark
      ? 'rgba(255,255,255,0.1)'
      : 'rgba(0,0,0,0.14)';
  const searchPressedSurface = t.sunlightMode ? t.colors.accentSubtle : t.isDark
    ? 'rgba(255,255,255,0.03)'
    : 'rgba(0,0,0,0.04)';
  const searchBorderWidth = t.sunlightMode ? 1 : StyleSheet.hairlineWidth;
  const searchIconColor = t.colors.sectionFg;
  const searchPlaceholderColor = t.colors.searchPlaceholder;
  const capturePlaceholderColor = t.colors.metaFg;
  const searchFieldFg = t.sunlightMode ? t.colors.fg : t.colors.fgDim;
  const headerLogoColor = t.sunlightMode ? t.colors.metaFg : t.colors.fgDim;
  const headerLogoSize = 42;
  /** Ring geometry: align **outer ring** with search field (gutter only); composer is inset +`screenContentInnerPad`. */
  const headerLogoAlignStyle = { marginLeft: -chinottoLogoLeadingOutset(headerLogoSize) };

  return (
    <View style={styles.shell}>
      <AmbientBackground />
      <SafeAreaView style={styles.safe} edges={['top', 'right', 'left']}>
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
              <Pressable
                accessibilityLabel="Chinotto"
                accessibilityHint="Opens Settings"
                hitSlop={12}
                onPress={() => setSettingsRoute('settings')}
              >
                <ChinottoLogo
                  testID="header-logo"
                  size={headerLogoSize}
                  color={headerLogoColor}
                  style={headerLogoAlignStyle}
                />
              </Pressable>
              {isFirebaseSyncConfigured() && Platform.OS === 'ios' ? (
                <SyncHeaderStatus
                  phase={headerAuthPhase}
                  uploadPending={headerAuthPhase === 'signed_in' && uploadPending}
                  uploadStuck={headerAuthPhase === 'signed_in' && uploadStuck}
                  onPress={openSyncModalFromHeader}
                  enableSyncLabelShimmer={!screenshotActive && enableSyncLabelShimmer}
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
              },
            ]}
          >
            {/*
              Gutter on composer + search affordance. Stream stays full width (see RecentList).
            */}
            <View style={{ paddingHorizontal: gutter }}>
              <View style={styles.composerBlock}>
                <View style={styles.composerInputRow}>
                  <View style={styles.composerInputWrap}>
                    <CaptureInput
                      ref={inputRef}
                      value={text}
                      onChangeText={setText}
                      onFocus={onCaptureComposerFocus}
                      onSubmit={handleSubmit}
                      minHeight={composerMinHeight}
                      maxHeight={composerMaxHeight}
                      placeholder="Jot a thought…"
                      placeholderTextColor={capturePlaceholderColor}
                      autoFocus={
                        allowCaptureFocus && !screenshotActive && !deferKeyboardForFirstLaunchReveal
                      }
                    />
                  </View>
                  {showVoiceCapture ? (
                    <VoiceMicButton
                      phase={voicePhase}
                      theme={t}
                      onPress={() => {
                        if (voicePhase === 'listening') {
                          stopVoiceCaptureSession();
                        } else {
                          voiceCaptureBaseRef.current = text;
                          void startVoiceCaptureSession();
                        }
                      }}
                    />
                  ) : null}
                </View>
              </View>
              {entries.length > 0 ? (
                <View style={{ marginTop: t.spacing.lg }}>
                  {searchExpanded ? (
                    <View
                      style={[
                        styles.searchPill,
                        styles.searchPillExpanded,
                        {
                          backgroundColor: searchSurface,
                          borderColor: searchFocused ? searchBorderFocus : searchBorderIdle,
                          borderWidth: searchBorderWidth,
                        },
                      ]}
                    >
                      <Ionicons name="search" size={15} color={searchIconColor} style={styles.searchPillIcon} />
                      <TextInput
                        ref={searchInputRef}
                        testID="stream-search-input"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onFocus={onSearchFocus}
                        onBlur={onSearchBlur}
                        placeholder="Find in stream…"
                        placeholderTextColor={searchPlaceholderColor}
                        accessibilityLabel="Find in stream"
                        style={[
                          styles.searchFieldExpanded,
                          {
                            fontFamily: fonts.regular,
                            color: searchFieldFg,
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
                            backgroundColor: pressed ? searchPressedSurface : 'transparent',
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
                          backgroundColor: pressed ? searchPressedSurface : searchSurface,
                          borderColor: searchBorderIdle,
                          borderWidth: searchBorderWidth,
                          opacity: pressed ? 0.96 : 1,
                        },
                      ]}
                      android_ripple={{
                        color: t.sunlightMode ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.03)',
                        borderless: false,
                      }}
                    >
                      <Ionicons name="search" size={15} color={searchIconColor} style={styles.searchPillIcon} />
                      <Text
                        style={[
                          styles.searchPillHint,
                          {
                            color: searchIconColor,
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
              ) : null}
            </View>
            <RecentList
              entries={searchTrimmed.length > 0 ? searchResults : entries}
              visible
              deferEmptyStreamMotion={!allowCaptureFocus}
              streamEmptyAmbient={searchTrimmed.length === 0 && entries.length === 0}
              streamEmptyAmbientSuppressed={streamEmptyAmbientSuppressed}
              highlightEntryId={searchTrimmed.length > 0 ? null : streamHighlightEntryId}
              emptyHint={
                searchTrimmed.length > 0
                  ? 'Nothing matches that search.'
                  : entries.length === 0
                    ? 'Write it down.\nIt stays.'
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
            <Pressable
              style={[styles.bottomFill, { flexGrow: 1, minHeight: 1 }]}
              accessible={false}
              onPress={Keyboard.dismiss}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      {settingsRoute === 'settings' ? (
        <SettingsScreen
          onClose={() => setSettingsRoute(null)}
          onOpenSync={openSyncModalFromHeader}
          onOpenManifesto={() => setSettingsRoute('manifesto')}
          canOpenAppIcon={ENABLE_APP_ICON_SWITCHER}
          onOpenAppIcon={
            ENABLE_APP_ICON_SWITCHER
              ? () => setSettingsRoute('app_icon')
              : undefined
          }
          appIconLabel={ENABLE_APP_ICON_SWITCHER ? getAppIconVariant(appIconVariantId).name : undefined}
          syncStatusLabel={
            headerAuthPhase === 'restoring'
              ? 'Checking sync'
              : headerAuthPhase === 'signed_in'
                ? uploadStuck
                  ? 'Sync paused'
                  : uploadPending
                    ? 'Syncing…'
                    : 'Sync on'
                : 'Off'
          }
          hapticsEnabled={hapticsEnabled}
          onHapticsEnabledChange={persistHapticsEnabled}
          onOpenDevMenu={__DEV__ && Platform.OS === 'ios' ? openDevMenuFromSettings : undefined}
        />
      ) : null}
      {settingsRoute === 'manifesto' ? (
        <ManifestoScreen
          onClose={() => setSettingsRoute('settings')}
        />
      ) : null}
      {ENABLE_APP_ICON_SWITCHER && settingsRoute === 'app_icon' ? (
        <AppIconScreen
          selectedId={appIconVariantId}
          supportsDynamicIcons={supportsDynamicAppIcons()}
          onSelect={(id) => {
            void setCurrentAppIconVariantId(id)
              .then(setAppIconVariantId)
              .catch((error) => {
                if (__DEV__) {
                  console.warn('[AppIcon] setCurrentAppIconVariantId failed', error);
                }
                Alert.alert(
                  'Could not change app icon',
                  String(error?.message ?? error ?? 'Please reinstall/rebuild the iOS app and try again.')
                );
              });
          }}
          onClose={() => setSettingsRoute('settings')}
        />
      ) : null}
      {/* Enable sync sheet: opened only from the header CTA. Paid step uses monetization/syncPurchaseFlow when EXPO_PUBLIC_ENABLE_PAYWALL=true. */}
      <EnableSyncModal
        visible={syncModalVisible}
        onClose={() => setSyncModalVisible(false)}
        onEnabled={() => {
          if (screenshotActive) {
            setSyncModalVisible(false);
            return;
          }
          setAuthRestorePhase('signed_in');
          void getPendingSyncCount()
            .then((n) => setUploadPending(n > 0))
            .catch(() => {});
        }}
        authPhase={headerAuthPhase}
        subscriptionHydrated={subscriptionHydrated}
        onSubscriptionUnlocked={onSubscriptionUnlocked}
        devPostSyncPreviewNonce={
          __DEV__ && devPostSyncPreviewNonce > 0 ? devPostSyncPreviewNonce : undefined
        }
        syncHealthNote={
          headerAuthPhase === 'signed_in' && uploadStuck
            ? 'Uploads are waiting—check your connection. Nothing is lost; thoughts stay on this device.'
            : null
        }
        marketingPreviewAppleConnectStep={
          screenshotActive && screenshotScene === 'sync_apple'
        }
        marketingPreviewFreezeActions={screenshotActive}
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
  composerInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  composerInputWrap: {
    flex: 1,
    minWidth: 0,
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
