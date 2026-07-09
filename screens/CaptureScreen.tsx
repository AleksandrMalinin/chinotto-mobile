import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentRef, type RefObject } from 'react';

import { track, type SyncModalSurface } from '../analytics/analytics';
import { onAuthStateChanged } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  Alert,
  Animated,
  AppState,
  DevSettings,
  Easing,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Linking,
  Modal,
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
  PixelRatio,
  type LayoutAnimationConfig,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CaptureContinuationHint } from '../components/CaptureContinuationHint';
import { EchoPageShell } from '../components/echo/EchoPageShell';
import { EchoSpatialBackground } from '../components/echo/EchoSpatialBackground';
import {
  EchoSwipeRecallHint,
} from '../components/echo/EchoSwipeRecallHint';
import { echoChromeFromTheme } from '../components/echo/echoChrome';
import {
  StreamEchoPager,
  streamEchoPagerHomeOffset,
  type StreamEchoPagerHandle,
} from '../components/echo/StreamEchoPager';
import { runEchoEdgePeekAnimation } from '../components/echo/runEchoEdgePeekAnimation';
import { CaptureInput } from '../components/CaptureInput';
import { ChinottoLogo, chinottoLogoLeadingOutset } from '../components/ChinottoLogo';
import { EnableSyncModal } from '../components/EnableSyncModal';
import { EntryThoughtSheet } from '../components/EntryThoughtSheet';
import { RecentList } from '../components/RecentList';
import { StreamBackToNowPill } from '../components/StreamBackToNowPill';
import { StreamSearchField } from '../components/StreamSearchField';
import { StreamSearchGlyph } from '../components/stream/StreamSearchGlyph';
import { TemporalMapSheet } from '../components/temporal/TemporalMapSheet';
import { TemporalMonthRack } from '../components/temporal/TemporalMonthRack';
import type { ThoughtSheetOpenAnchor } from '../components/thoughtSheet/detents';
import type { SheetEnterProfile } from '../components/thoughtSheet/useSheetEnterAnimation';
import { openAfterKeyboardHidden } from '../components/thoughtSheet/openAfterKeyboardHidden';
import { SyncHeaderStatus, type SyncHeaderAuthPhase } from '../components/SyncHeaderStatus';
import { VoiceMicButton, VOICE_MIC_CLUSTER_OVERFLOW_PAD_TOP } from '../components/VoiceCaptureControl';
import { AppIconScreen } from './AppIconScreen';
import { DeleteAccountScreen } from './DeleteAccountScreen';
import { ManifestoScreen } from './ManifestoScreen';
import { SettingsScreen } from './SettingsScreen';
import { ENABLE_APP_ICON_SWITCHER } from '../src/features/flags';
import { mergeVoiceTranscript } from '../src/features/voiceCapture/mergeVoiceTranscript';
import { useVoiceCapture } from '../src/features/voiceCapture/useVoiceCapture';
import {
  getCurrentAppIconVariantId,
  setCurrentAppIconVariantId,
  supportsDynamicAppIcons,
} from '../src/services/icons/appIcon';
import { getAppIconVariant, type AppIconVariantId } from '../src/services/icons/iconVariants';
import type { Entry } from '../types/entry';
import { mergeDemoStreamWithEntries, isDemoStreamEntryId } from '../dev/demoStreamEntries';
import { resetPaywallForPurchaseTesting } from '../dev/resetPaywallForPurchaseTesting';
import { showDevMenu } from '../dev/showDevMenu';
import { isDemoStreamMode } from '../src/features/demoStreamMode';
import { motion } from '../constants/motion';
import {
  STREAM_LOAD_MORE_LOOKAHEAD_PX,
  STREAM_SCROLL_STATE_THROTTLE_MS,
} from '../constants/streamFocus';
import { ECHO_UI_VARIANT_SHIPPED } from '../constants/echoUiVariant';
import {
  ECHO_COMPOSER_DIM_AT_FULL,
  ECHO_LAYER_ACTIVE,
  ECHO_COMPOSER_DIM_RELEASE_AT,
  ECHO_EDGE_PEEK_INITIAL_DELAY_MS,
  ECHO_RECALL_DIM_IN_MS,
  ECHO_RECALL_DIM_OUT_DELAY_MS,
  ECHO_RECALL_DIM_OUT_MS,
  ECHO_RECALL_SHEET_DIM,
  RESURFACE_SHOW_PROBABILITY,
} from '../constants/echoLayer';
import {
  TEMPORAL_NAV_ENABLED,
  TEMPORAL_NAV_MIN_SCROLL_Y,
  TEMPORAL_NAV_SCRUBBER_IDLE_MS,
  TEMPORAL_RACK_BOTTOM_INSET,
  TEMPORAL_TRAILING_CHROME_RIGHT_INSET,
} from '../constants/temporalNavigation';
import {
  clearFirstLaunchEmptyCaptureRevealDone,
  getFirstLaunchComposerHasFocused,
  getFirstLaunchEmptyCaptureRevealDone,
  setFirstLaunchComposerHasFocused,
  setFirstLaunchEmptyCaptureRevealDone,
} from '../storage/firstLaunchCapturePrefs';
import {
  clearEchoEdgePeekDone,
  getEchoSwipeHintDismissed,
  recordEchoCandidatesDisplayed,
  setEchoEdgePeekLastAt,
  setEchoSwipeHintDismissed,
  shouldOfferEchoEdgePeek,
  setEchoLastBackgroundAt,
  setEchoSessionThread,
} from '../storage/echoLayerPrefs';
import {
  getEchoCandidates,
  recordEntryOpened,
  resolveEchoCandidates,
} from '../storage/entryEngagementRepository';
import { markAsShown } from '../storage/resurfaceSession';
import {
  deleteEntry,
  getEntriesOlderThan,
  getEntryById,
  getEntryCount,
  getMonthSummaries,
  getRecentEntries,
  saveEntry,
  searchEntriesForRecall,
} from '../storage/entryRepository';
import {
  loadSyncHighlightSignals,
  recordOpenedExistingThoughtForSyncHighlight,
  recordSearchUsedForSyncHighlight,
  recordStreamDeepScrolledForSyncHighlight,
  recordSyncShimmerImpression,
} from '../storage/syncHighlightSignals';
import {
  hasSyncHeaderCtaBeenTapped,
  recordSyncHeaderCtaTapped,
  resetSyncHeaderShimmerPrefsForDev,
} from '../storage/syncHeaderShimmerPrefs';
import { getHapticsEnabled } from '../storage/settingsPrefs';
import { isFirebaseSyncConfigured } from '../sync/firebaseConfig';
import { syncRecentThoughtsToWidget } from '../widgets/widgetThoughtsBridge';
import { getOrInitAuth } from '../sync/firebaseAuth';
import { getPendingSyncCount } from '../sync/syncQueue';
import { mirrorChinottoSyncAccessToFirestore } from '../sync/firestoreSyncAccessMirror';
import { flushSyncTombstoneOutbox } from '../sync/tombstoneFlush';
import {
  SYNC_HIGHLIGHT_SCHEDULE_DELAY_MS,
  SYNC_HIGHLIGHT_STREAM_SCROLL_DEPTH_PX,
} from '../sync/syncHighlightConstants';
import { getSyncHighlightEligibility } from '../sync/syncHighlightEligibility';
import {
  captureInputPaddingTop,
  fonts,
  radius,
  screenContentGutter,
  screenContentInnerPad,
  spacing,
  useAppTheme,
} from '../theme';
import type { MonthKey, MonthSummary } from '../types/temporal';
import { getCaptureContinuationHint } from '../utils/captureContinuationHint';
import type { CaptureContinuationHint as CaptureContinuationHintData } from '../utils/captureContinuationHint';
import { monthKeyFromIso } from '../utils/streamMonthIndex';
import { streamSearchResultLabel } from '../utils/streamSearchResultLabel';
import { loadStreamUntilEntryIncluded, resolveMonthJumpAnchor } from '../utils/temporalJump';
import { ensureEchoCandidatesForDev } from '../utils/ensureEchoCandidatesForDev';
import {
  COMPOSER_ACTION_CLUSTER_LEADING_GAP,
  COMPOSER_ACTION_CLUSTER_WIDTH,
  composerActionClusterExpanded,
} from '../utils/composerActionCluster';
import {
  streamPullSearchDragEligibleAtStart,
  streamPullSearchProgress,
  streamPullSearchShouldCommitFromGesture,
} from '../utils/streamPullToSearch';
import { isEchoLayerMountedForCapture } from '../utils/echoLayerMount';
import { isEchoPagerInteractive } from '../utils/echoLayerVisibility';
import { echoEmotionalIntensityFromEntries } from '../utils/echoEmotionalAtmosphere';
import {
  isTemporalScrubberEligible,
} from '../utils/temporalScrubberVisibility';

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
const ENABLE_SYNC_SHIMMER_MAX_AUTH_PROBES = 28;
/** Firebase session restore vs signed-out; avoids showing Enable sync before persistence restores. */
export type AuthRestorePhase = SyncHeaderAuthPhase;

export type CaptureScreenProps = {
  /** Increment when Firestore ingest applies remote changes (desktop → mobile). */
  remoteIngestVersion?: number;
  /** Increment when entries change outside this screen (e.g. system share). */
  externalEntriesEpoch?: number;
  /** Increment when the app should move focus to capture (e.g. home screen widget open). */
  captureFocusNonce?: number;
  /** Increment when widget requests direct voice mode (chinotto://capture?mode=voice). */
  voiceCaptureRequestNonce?: number;
  /** Entry id from widget deep link (chinotto://thought/<id>) to open in read sheet. */
  thoughtEntryRequestId?: string | null;
  /** Row id receiving the transient “just landed” tint (capture or share). */
  streamHighlightEntryId?: string | null;
  /** Schedule/clear handled in parent so manual capture and share share one timer. */
  onScheduleStreamHighlight?: (entryId: string) => void;
  /** From App after {@link loadSubscriptionState}; defaults true for tests / isolation. */
  subscriptionHydrated?: boolean;
  /** Stub or real Plus purchase completed — refresh Firestore ingest when paywall is on. */
  onSubscriptionUnlocked?: () => void;
  /** Anonymous Umami opt-in (Settings). */
  analyticsEnabled?: boolean;
  onAnalyticsOptInChange?: (enabled: boolean) => void;
  /** Fires once when the stream has at least one saved thought (Umami opt-in timing). */
  onAnalyticsPresentationGateReady?: () => void;
  /** Dev: clear prompt flag and reload the JS bundle (QA). */
  onResetAnalyticsPrompt?: () => void;
  /** Dev: show the app update modal (soft / forced) from Settings → dev menu. */
  onDevPreviewAppUpdate?: (mode: 'soft' | 'forced') => void;
  /**
   * Increment (from universal link / custom scheme) to open the same sync sheet as the header CTA,
   * without recording a header “tap” for shimmer prefs.
   */
  syncEntryRequestNonce?: number;
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
  voiceCaptureRequestNonce = 0,
  thoughtEntryRequestId = null,
  streamHighlightEntryId = null,
  onScheduleStreamHighlight,
  subscriptionHydrated = true,
  onSubscriptionUnlocked,
  analyticsEnabled = false,
  onAnalyticsOptInChange,
  onAnalyticsPresentationGateReady,
  onResetAnalyticsPrompt,
  onDevPreviewAppUpdate,
  syncEntryRequestNonce = 0,
  allowCaptureFocus = true,
  syncModalVisible: syncModalVisibleProp,
  onSyncModalVisibleChange,
}: CaptureScreenProps = {}) {
  const [text, setText] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const demoStreamMode = isDemoStreamMode();
  const streamDisplayEntries = useMemo(
    () => mergeDemoStreamWithEntries(entries, demoStreamMode),
    [entries, demoStreamMode],
  );
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
  const [readEntryAnchor, setReadEntryAnchor] = useState<ThoughtSheetOpenAnchor | null>(null);
  const [readEntryHapticOnPresent, setReadEntryHapticOnPresent] = useState(false);
  const [readEntryEnterProfile, setReadEntryEnterProfile] = useState<SheetEnterProfile>('stream');
  const [readEntryResumeOnOpen, setReadEntryResumeOnOpen] = useState(false);
  const [showBackToNow, setShowBackToNow] = useState(false);
  /** After closing read sheet, avoid composer autoFocus until user taps the field. */
  const [suppressComposerAutoFocus, setSuppressComposerAutoFocus] = useState(false);
  const echoRecallDim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (readEntry == null) {
      echoRecallDim.stopAnimation();
      echoRecallDim.setValue(1);
    }
  }, [echoRecallDim, readEntry]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Entry[]>([]);
  const [searchTruncated, setSearchTruncated] = useState(false);
  /** Search is secondary: hidden until user opens it — avoids competing with capture. */
  const [searchExpanded, setSearchExpanded] = useState(false);
  /** 0–1 while pulling down at stream top to reveal search (hidden by default). */
  const [searchPullProgress, setSearchPullProgress] = useState(0);
  const [searchFocused, setSearchFocused] = useState(false);
  const [settingsRoute, setSettingsRoute] = useState<SettingsRoute | null>(null);
  const [accountDeletionOpen, setAccountDeletionOpen] = useState(false);
  const [firebaseAccountLabel, setFirebaseAccountLabel] = useState<string | null>(null);
  const [appIconVariantId, setAppIconVariantId] = useState<AppIconVariantId>('default');
  const [hapticsEnabled, setHapticsEnabledState] = useState(true);
  const [authRestorePhase, setAuthRestorePhase] = useState<AuthRestorePhase>(() =>
    isFirebaseSyncConfigured() && Platform.OS === 'ios' ? 'restoring' : 'signed_out'
  );
  const [uploadPending, setUploadPending] = useState(false);
  const [uploadStuck, setUploadStuck] = useState(false);
  const [enableSyncLabelShimmer, setEnableSyncLabelShimmer] = useState(false);
  /** Bumps when engagement signals change so contextual sync highlight can re-evaluate. */
  const [syncHighlightTick, setSyncHighlightTick] = useState(0);
  /** Scroll position + viewport height for stream viewport-driven row emphasis (RecentList). */
  const [streamScrollY, setStreamScrollY] = useState(0);
  const [streamScrollVelocityY, setStreamScrollVelocityY] = useState(0);
  const [streamViewportHeight, setStreamViewportHeight] = useState(0);
  const [streamLoadingMore, setStreamLoadingMore] = useState(false);
  const [totalEntryCount, setTotalEntryCount] = useState(0);
  const [echoCandidates, setEchoCandidates] = useState<EchoCandidate[]>([]);
  const [echoSwipeHintVisible, setEchoSwipeHintVisible] = useState(false);
  const [captureContinuationHint, setCaptureContinuationHint] =
    useState<CaptureContinuationHintData | null>(null);
  const echoCandidatesRef = useRef<EchoCandidate[]>([]);
  const [echoPageIndex, setEchoPageIndex] = useState<0 | 1>(0);
  const echoPageIndexRef = useRef<0 | 1>(0);
  const echoPagerPageSettledRef = useRef(false);
  const echoEdgePeekInFlightRef = useRef(false);
  const triedEchoRecallRef = useRef(false);
  const streamEchoPagerRef = useRef<StreamEchoPagerHandle>(null);
  const echoPagerScrollX = useRef(new Animated.Value(0)).current;
  const [streamActiveEntry, setStreamActiveEntry] = useState<Entry | null>(null);
  const [monthSummaries, setMonthSummaries] = useState<MonthSummary[]>([]);
  const [temporalRackScrubbing, setTemporalRackScrubbing] = useState(false);
  /** True at capture — rack stays off until user scrolls into the stream again. */
  const [temporalRackAtCapture, setTemporalRackAtCapture] = useState(true);
  const [temporalMapVisible, setTemporalMapVisible] = useState(false);
  const [scrollToEntryId, setScrollToEntryId] = useState<string | null>(null);
  /** Pins rack + map highlight until stream scroll/active entry catches up after a jump. */
  const [temporalCommittedMonthKey, setTemporalCommittedMonthKey] = useState<MonthKey | null>(null);
  const streamScrollViewRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const streamScrollYRef = useRef(0);
  const streamScrollStateCommitAtRef = useRef(0);
  const streamPullStateCommitAtRef = useRef(0);
  const streamPullDragEligibleRef = useRef(false);
  const streamPullDragMaxPxRef = useRef(0);
  const streamScrollIdleGenRef = useRef(0);
  const temporalRackScrubbingRef = useRef(false);
  temporalRackScrubbingRef.current = temporalRackScrubbing;
  /** __DEV__: incremented from dev menu to re-show “Sync enabled” / desktop link sheet. */
  const [devPostSyncPreviewNonce, setDevPostSyncPreviewNonce] = useState(0);
  const stuckPollsRef = useRef(0);
  const lastSyncEntryNonceRef = useRef(0);
  const authPhaseRef = useRef(authRestorePhase);
  const lastVoiceRequestNonceRef = useRef(0);
  const lastThoughtRequestIdRef = useRef<string | null>(null);
  /** Calm delay before running {@link runEnableSyncShimmerProbe} when eligibility may have flipped. */
  const syncHighlightScheduleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Retries while {@link AuthRestorePhase} is still `restoring` when the shimmer probe runs. */
  const enableSyncAuthRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enableSyncShimmerAuthRetryRef = useRef(0);
  const syncModalVisibleRef = useRef(syncModalVisible);
  syncModalVisibleRef.current = syncModalVisible;
  const deepScrollRecordedRef = useRef(false);
  const searchSignalLoggedRef = useRef(false);
  const inputRef = useRef<TextInput>(null);
  const searchInputRef = useRef<TextInput>(null);
  const composerSearchDim = useRef(new Animated.Value(1)).current;
  /** 1 = empty capture (actions visible); 0 = thought present (actions stepped aside). */
  const composerActionClusterPresence = useRef(new Animated.Value(1)).current;
  const readEntryOpenCleanupRef = useRef<(() => void) | null>(null);
  const searchBlurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchDismissIntentRef = useRef(false);
  const entriesRef = useRef<Entry[]>([]);
  const monthSummariesRef = useRef<MonthSummary[]>([]);
  const streamScrollAnimatedRef = useRef(true);
  const temporalPreviewMonthRef = useRef<MonthKey | null>(null);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const searchQueryRef = useRef('');
  const searchExpandedRef = useRef(false);
  const streamHasRowsRef = useRef(false);
  searchExpandedRef.current = searchExpanded;
  streamHasRowsRef.current = streamDisplayEntries.length > 0;
  const searchActiveRef = useRef(false);
  const recallSearchActiveRef = useRef(false);
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
  const analyticsGateReportedRef = useRef(false);
  const { width: windowWidth } = useWindowDimensions();
  const echoPageWidth = PixelRatio.roundToNearestPixel(windowWidth);
  const t = useAppTheme();
  const insets = useSafeAreaInsets();
  const gutter = screenContentGutter(windowWidth);

  authPhaseRef.current = authRestorePhase;

  entriesRef.current = entries;
  monthSummariesRef.current = monthSummaries;
  hasMoreRef.current = hasMore;
  searchQueryRef.current = searchQuery;
  const searchTrimmed = searchQuery.trim();
  searchActiveRef.current = searchTrimmed.length > 0;
  recallSearchActiveRef.current =
    searchExpanded || searchFocused || searchTrimmed.length > 0;
  const recallSearchActive = recallSearchActiveRef.current;
  /** Recall mode: search replaces the capture row — one focus, not two competing top actions. */
  const searchRecallMode = streamDisplayEntries.length > 0 && searchExpanded;

  const searchResultLabel = useMemo(
    () => streamSearchResultLabel(searchExpanded, searchTrimmed, searchResults.length),
    [searchExpanded, searchTrimmed, searchResults.length],
  );

  useEffect(() => {
    void getHapticsEnabled().then(setHapticsEnabledState);
  }, []);

  useEffect(() => {
    if (!ENABLE_APP_ICON_SWITCHER) {
      return;
    }
    void getCurrentAppIconVariantId().then(setAppIconVariantId);
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

  const focusCaptureComposer = useCallback(() => {
    if (recallSearchActiveRef.current || readEntry != null) {
      return;
    }
    inputRef.current?.focus();
  }, [readEntry]);

  const expandSearch = useCallback(() => {
    const opening = !searchExpandedRef.current;
    if (opening) {
      streamScrollYRef.current = 0;
      setStreamScrollY(0);
      setStreamScrollVelocityY(0);
      setTemporalRackAtCapture(true);
      setSearchPullProgress(0);
      streamScrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }
    playSearchChromeHaptic();
    inputRef.current?.blur();
    if (searchBlurTimerRef.current) {
      clearTimeout(searchBlurTimerRef.current);
      searchBlurTimerRef.current = null;
    }
    setSearchFocused(true);
    animateSearchLayout();
    searchExpandedRef.current = true;
    streamPullDragEligibleRef.current = false;
    streamPullDragMaxPxRef.current = 0;
    setSearchExpanded(true);
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }, [playSearchChromeHaptic]);

  const releaseComposerFocus = useCallback(() => {
    Keyboard.dismiss();
    inputRef.current?.blur();
    searchInputRef.current?.blur();
  }, []);

  /** Close search UI without leaving Echo — avoids search unmount stealing focus to capture. */
  const stashSearchForEchoNavigation = useCallback(() => {
    if (!searchExpanded) {
      releaseComposerFocus();
      return;
    }
    searchDismissIntentRef.current = true;
    if (searchBlurTimerRef.current) {
      clearTimeout(searchBlurTimerRef.current);
      searchBlurTimerRef.current = null;
    }
    setSearchFocused(false);
    searchExpandedRef.current = false;
    setSearchExpanded(false);
    releaseComposerFocus();
    requestAnimationFrame(() => {
      searchDismissIntentRef.current = false;
    });
  }, [releaseComposerFocus, searchExpanded]);

  const collapseSearch = useCallback(() => {
    playSearchChromeHaptic();
    searchDismissIntentRef.current = true;
    if (searchBlurTimerRef.current) {
      clearTimeout(searchBlurTimerRef.current);
      searchBlurTimerRef.current = null;
    }
    setSearchFocused(false);
    setSearchQuery('');
    searchExpandedRef.current = false;
    setSearchExpanded(false);
    Keyboard.dismiss();
    streamEchoPagerRef.current?.scrollToStream(false);
    setEchoPageIndex(0);
    requestAnimationFrame(() => {
      searchDismissIntentRef.current = false;
    });
  }, [playSearchChromeHaptic, releaseComposerFocus]);

  const onSearchFocus = useCallback(() => {
    inputRef.current?.blur();
    setSearchFocused(true);
    if (searchBlurTimerRef.current) {
      clearTimeout(searchBlurTimerRef.current);
      searchBlurTimerRef.current = null;
    }
  }, []);

  /** Blur does not collapse search — iOS ghost field + layout were stealing focus to capture. */
  const onSearchBlur = useCallback(() => {
    if (searchDismissIntentRef.current) {
      return;
    }
  }, []);

  const onSearchChangeText = useCallback((text: string) => {
    setSearchQuery(text);
    if (!searchExpanded) {
      return;
    }
    inputRef.current?.blur();
    if (searchBlurTimerRef.current) {
      clearTimeout(searchBlurTimerRef.current);
      searchBlurTimerRef.current = null;
    }
    setSearchFocused(true);
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }, [searchExpanded]);

  const refreshTotalEntryCount = useCallback(() => {
    void getEntryCount()
      .then(setTotalEntryCount)
      .catch((err) => {
        if (__DEV__) {
          console.warn('getEntryCount failed', err);
        }
      });
  }, []);

  const handleScrollBeginDrag = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const eligible = streamPullSearchDragEligibleAtStart(y);
    streamPullDragEligibleRef.current = eligible;
    streamPullDragMaxPxRef.current = 0;
    streamPullStateCommitAtRef.current = 0;
    if (!eligible) {
      setSearchPullProgress(0);
    }
  }, []);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize, velocity } = e.nativeEvent;
    const y = contentOffset.y;
    streamScrollYRef.current = y;
    const now = Date.now();
    if (
      !searchExpandedRef.current &&
      streamHasRowsRef.current &&
      streamPullDragEligibleRef.current
    ) {
      const pullPx = y < 0 ? -y : 0;
      if (pullPx > streamPullDragMaxPxRef.current) {
        streamPullDragMaxPxRef.current = pullPx;
      }
      if (now - streamPullStateCommitAtRef.current >= STREAM_SCROLL_STATE_THROTTLE_MS) {
        streamPullStateCommitAtRef.current = now;
        setSearchPullProgress(pullPx === 0 ? 0 : streamPullSearchProgress(pullPx));
      }
    }
    if (now - streamScrollStateCommitAtRef.current >= STREAM_SCROLL_STATE_THROTTLE_MS) {
      streamScrollStateCommitAtRef.current = now;
      setStreamScrollY(Math.max(0, y));
      if (y < 48) {
        setShowBackToNow(false);
      }
    }
    if (y < TEMPORAL_NAV_MIN_SCROLL_Y) {
      setTemporalRackAtCapture(true);
    } else {
      setTemporalRackAtCapture(false);
    }
    const vy = velocity?.y ?? 0;
    setStreamScrollVelocityY(vy);
    const idleGen = streamScrollIdleGenRef.current + 1;
    streamScrollIdleGenRef.current = idleGen;
    setTimeout(() => {
      if (streamScrollIdleGenRef.current === idleGen) {
        setStreamScrollVelocityY(0);
      }
    }, TEMPORAL_NAV_SCRUBBER_IDLE_MS);

    if (!deepScrollRecordedRef.current && contentOffset.y >= SYNC_HIGHLIGHT_STREAM_SCROLL_DEPTH_PX) {
      deepScrollRecordedRef.current = true;
      void recordStreamDeepScrolledForSyncHighlight();
      setSyncHighlightTick((n) => n + 1);
    }

    const distanceFromEnd =
      contentSize.height - (layoutMeasurement.height + contentOffset.y);
    const nearLoadZone =
      distanceFromEnd <= STREAM_LOAD_MORE_LOOKAHEAD_PX &&
      hasMoreRef.current &&
      !searchActiveRef.current;
    if (nearLoadZone) {
      setStreamLoadingMore(true);
    } else if (!loadingMoreRef.current) {
      setStreamLoadingMore(false);
    }

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
    setStreamLoadingMore(true);
    const last = list[list.length - 1];
    void (async () => {
      try {
        const batch = await getEntriesOlderThan(last, PAGE_SIZE + 1);
        const more = batch.length > PAGE_SIZE;
        const page = batch.slice(0, PAGE_SIZE);
        InteractionManager.runAfterInteractions(() => {
          setEntries((prev) => {
            const ids = new Set(prev.map((x) => x.id));
            const merged = page.filter((row) => !ids.has(row.id));
            return [...prev, ...merged];
          });
          setHasMore(more);
        });
      } catch (err) {
        if (__DEV__) {
          console.warn('getEntriesOlderThan failed', err);
        }
      } finally {
        loadingMoreRef.current = false;
      }
    })();
  }, []);

  const handleScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const maxPullPx = streamPullDragMaxPxRef.current;
      const dragEligible = streamPullDragEligibleRef.current;
      streamPullDragEligibleRef.current = false;
      streamPullDragMaxPxRef.current = 0;
      setSearchPullProgress(0);
      if (
        streamPullSearchShouldCommitFromGesture({ dragEligible, maxPullPx }) &&
        streamHasRowsRef.current &&
        !searchExpandedRef.current
      ) {
        expandSearch();
      } else if (y < 0) {
        streamScrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }
    },
    [expandSearch],
  );

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    try {
      const { entries: rows, truncated } = await searchEntriesForRecall(q, SEARCH_MAX_RESULTS);
      setSearchResults(rows);
      setSearchTruncated(truncated);
      if (!searchSignalLoggedRef.current && trimmed.length > 0) {
        searchSignalLoggedRef.current = true;
        void recordSearchUsedForSyncHighlight();
        setSyncHighlightTick((n) => n + 1);
      }
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
    } finally {
      refreshTotalEntryCount();
    }
  }, [refreshTotalEntryCount]);

  useEffect(() => {
    void refreshEntries();
  }, [refreshEntries, remoteIngestVersion, externalEntriesEpoch]);

  useEffect(() => {
    if (!TEMPORAL_NAV_ENABLED) {
      return;
    }
    void getMonthSummaries()
      .then(setMonthSummaries)
      .catch((err) => {
        if (__DEV__) {
          console.warn('getMonthSummaries failed', err);
        }
      });
  }, [entries.length]);

  useEffect(() => {
    if (!ECHO_LAYER_ACTIVE) {
      setEchoCandidates([]);
      return;
    }
    let cancelled = false;
    void resolveEchoCandidates({
      fallbackEntries: streamDisplayEntries,
      preferStreamFallback: __DEV__ && streamDisplayEntries.length > 0,
    })
      .then((raw) => {
        if (cancelled) {
          return;
        }
        if (raw.length === 0) {
          setEchoCandidates([]);
          return;
        }
        if (!triedEchoRecallRef.current) {
          triedEchoRecallRef.current = true;
          if (Math.random() > RESURFACE_SHOW_PROBABILITY) {
            setEchoCandidates([]);
            return;
          }
        }
        setEchoCandidates(raw);
      })
      .catch((err) => {
        if (__DEV__) {
          console.warn('resolveEchoCandidates failed', err);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [demoStreamMode, entries.length, totalEntryCount, streamDisplayEntries]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        void setEchoLastBackgroundAt().catch(() => {});
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (searchTrimmed.length > 0) {
      streamEchoPagerRef.current?.scrollToStream(false);
      setEchoPageIndex(0);
    }
  }, [searchTrimmed]);

  useEffect(() => {
    if (readEntry != null) {
      streamEchoPagerRef.current?.scrollToStream(false);
      setEchoPageIndex(0);
    }
  }, [readEntry?.id]);

  useEffect(() => {
    void syncRecentThoughtsToWidget(entries);
  }, [entries]);

  useEffect(() => {
    if (searchTrimmed.length > 0) {
      setTemporalMapVisible(false);
    }
  }, [searchTrimmed]);

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
    if (!captureFocusNonce) {
      return;
    }
    if (!allowCaptureFocus) {
      // Widget/deep-link may request capture while brand splash is still visible.
      // Keep the intent pending and focus only after the splash handoff allows input.
      splashFocusPendingRef.current = true;
      return;
    }
    if (readEntry != null) {
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
      focusCaptureComposer();
    });
    return () => cancelAnimationFrame(id);
  }, [allowCaptureFocus, captureFocusNonce, focusCaptureComposer, readEntry]);

  useEffect(() => {
    return () => {
      readEntryOpenCleanupRef.current?.();
    };
  }, []);

  // Blur composer when a different entry sheet opens — never Keyboard.dismiss here;
  // dismiss is global and would steal focus from the sheet editor after autosave rerenders.
  useEffect(() => {
    if (readEntry == null) {
      return;
    }
    inputRef.current?.blur();
    searchInputRef.current?.blur();
  }, [readEntry?.id]);

  const openReadEntrySheet = useCallback((
    entry: Entry,
    anchor?: ThoughtSheetOpenAnchor | null,
    options?: { hapticOnPresent?: boolean; enterProfile?: SheetEnterProfile; resumeOnOpen?: boolean },
  ) => {
    readEntryOpenCleanupRef.current?.();
    readEntryOpenCleanupRef.current = null;
    Keyboard.dismiss();
    inputRef.current?.blur();
    searchInputRef.current?.blur();
    const fromEcho = options?.enterProfile === 'echo';
    if (!isDemoStreamEntryId(entry.id)) {
      void recordEntryOpened(entry.id).catch(() => {});
      void setEchoSessionThread(entry.id).catch(() => {});
    }
    readEntryOpenCleanupRef.current = openAfterKeyboardHidden(() => {
      readEntryOpenCleanupRef.current = null;
      setReadEntryAnchor(anchor ?? null);
      setReadEntryHapticOnPresent(options?.hapticOnPresent ?? false);
      setReadEntryResumeOnOpen(options?.resumeOnOpen ?? false);
      setReadEntryEnterProfile(fromEcho ? 'echo' : 'stream');
      if (fromEcho) {
        echoRecallDim.stopAnimation();
        Animated.timing(echoRecallDim, {
          toValue: ECHO_RECALL_SHEET_DIM,
          duration: ECHO_RECALL_DIM_IN_MS,
          useNativeDriver: true,
        }).start();
      }
      setReadEntry(entry);
    });
  }, [echoRecallDim]);

  useEffect(() => {
    if (!thoughtEntryRequestId || thoughtEntryRequestId === lastThoughtRequestIdRef.current) {
      return;
    }
    lastThoughtRequestIdRef.current = thoughtEntryRequestId;
    void (async () => {
      const entry = await getEntryById(thoughtEntryRequestId);
      if (!entry) {
        return;
      }
      openReadEntrySheet(entry, null);
    })();
  }, [openReadEntrySheet, thoughtEntryRequestId]);

  useEffect(() => {
    if (!allowCaptureFocus) {
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
        focusCaptureComposer();
      });
    };

    const shouldDeferEmptyKeyboard =
      streamDisplayEntries.length === 0 &&
      (firstLaunchRevealDone !== true || !composerHasFocusedOnce);

    if (firstLaunchRevealDone === true) {
      if (shouldDeferEmptyKeyboard) {
        splashFocusPendingRef.current = false;
        return;
      }
      finishSplashFocus();
      return;
    }

    if (streamDisplayEntries.length > 0) {
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
    firstLaunchRevealDone,
    composerHasFocusedOnce,
    streamDisplayEntries.length,
    firstLaunchRevealDevResetNonce,
  ]);

  /** Fires once when the stream has at least one entry → App waits 4s (`ANALYTICS_OPTIN_DELAY_MS` in App) then may show Umami sheet. */
  useEffect(() => {
    if (!onAnalyticsPresentationGateReady) {
      return;
    }
    if (!allowCaptureFocus) {
      return;
    }
    if (entries.length === 0 || analyticsGateReportedRef.current) {
      return;
    }
    analyticsGateReportedRef.current = true;
    onAnalyticsPresentationGateReady();
  }, [onAnalyticsPresentationGateReady, allowCaptureFocus, entries.length]);

  useEffect(
    () => () => {
      if (syncHighlightScheduleTimerRef.current) {
        clearTimeout(syncHighlightScheduleTimerRef.current);
        syncHighlightScheduleTimerRef.current = null;
      }
      if (enableSyncAuthRetryTimerRef.current) {
        clearTimeout(enableSyncAuthRetryTimerRef.current);
        enableSyncAuthRetryTimerRef.current = null;
      }
    },
    []
  );

  useEffect(() => {
    void loadSyncHighlightSignals().then((s) => {
      if (s.hasDeepScrolledStream) {
        deepScrollRecordedRef.current = true;
      }
      if (s.hasUsedSearch) {
        searchSignalLoggedRef.current = true;
      }
    });
  }, []);

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

      setFirebaseAccountLabel(
        user && !user.isAnonymous ? (user.email?.trim() ? user.email.trim() : 'Apple ID') : null
      );
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
  const performEntryDelete = useCallback(
    (entry: Entry) => {
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
    },
    [refreshEntries, refreshUploadPending],
  );

  const handleEntryDelete = useCallback(
    (entry: Entry) => {
      if (isDemoStreamEntryId(entry.id)) {
        return;
      }
      performEntryDelete(entry);
    },
    [performEntryDelete],
  );

  const runEnableSyncShimmerProbe = useCallback(() => {
    void (async () => {
      if (!isFirebaseSyncConfigured() || Platform.OS !== 'ios') {
        return;
      }
      const [ctaTapped, signals, totalThoughtCount] = await Promise.all([
        hasSyncHeaderCtaBeenTapped(),
        loadSyncHighlightSignals(),
        getEntryCount(),
      ]);
      const { shouldShimmer } = getSyncHighlightEligibility({
        authPhase: authPhaseRef.current,
        syncFlowOpen: syncModalVisibleRef.current,
        totalThoughtCount,
        signals,
        syncHeaderCtaTapped: ctaTapped,
        nowMs: Date.now(),
      });
      if (!shouldShimmer) {
        return;
      }
      const phase = authPhaseRef.current;
      if (phase === 'signed_in') {
        return;
      }
      if (phase === 'restoring') {
        if (enableSyncShimmerAuthRetryRef.current >= ENABLE_SYNC_SHIMMER_MAX_AUTH_PROBES) {
          return;
        }
        enableSyncShimmerAuthRetryRef.current += 1;
        enableSyncAuthRetryTimerRef.current = setTimeout(() => {
          enableSyncAuthRetryTimerRef.current = null;
          runEnableSyncShimmerProbe();
        }, 280);
        return;
      }
      if (phase === 'signed_out') {
        enableSyncShimmerAuthRetryRef.current = 0;
        setEnableSyncLabelShimmer(true);
      }
    })();
  }, []);

  /**
   * Contextual Enable sync label shimmer: one calm delay after eligibility may have become true,
   * then a single masked sweep (see `SyncHeaderStatus`). Suppressed on first launch and while
   * sync UI is open — see `getSyncHighlightEligibility`.
   */
  useEffect(() => {
    if (!isFirebaseSyncConfigured() || Platform.OS !== 'ios') {
      return;
    }
    if (!allowCaptureFocus) {
      return;
    }
    if (syncModalVisible) {
      return;
    }

    if (syncHighlightScheduleTimerRef.current) {
      clearTimeout(syncHighlightScheduleTimerRef.current);
      syncHighlightScheduleTimerRef.current = null;
    }

    let cancelled = false;
    syncHighlightScheduleTimerRef.current = setTimeout(() => {
      syncHighlightScheduleTimerRef.current = null;
      if (!cancelled) {
        runEnableSyncShimmerProbe();
      }
    }, SYNC_HIGHLIGHT_SCHEDULE_DELAY_MS);

    return () => {
      cancelled = true;
      if (syncHighlightScheduleTimerRef.current) {
        clearTimeout(syncHighlightScheduleTimerRef.current);
        syncHighlightScheduleTimerRef.current = null;
      }
    };
  }, [
    allowCaptureFocus,
    authRestorePhase,
    entries.length,
    runEnableSyncShimmerProbe,
    syncHighlightTick,
    syncModalVisible,
  ]);

  const openSyncModal = useCallback(
    (surface: SyncModalSurface) => {
      Keyboard.dismiss();
      if (surface === 'header') {
        void recordSyncHeaderCtaTapped();
        if (syncHighlightScheduleTimerRef.current) {
          clearTimeout(syncHighlightScheduleTimerRef.current);
          syncHighlightScheduleTimerRef.current = null;
        }
        if (enableSyncAuthRetryTimerRef.current) {
          clearTimeout(enableSyncAuthRetryTimerRef.current);
          enableSyncAuthRetryTimerRef.current = null;
        }
        enableSyncShimmerAuthRetryRef.current = 0;
        setEnableSyncLabelShimmer(false);
      }
      track({ event: 'sync_modal_opened', surface });
      setSyncModalVisible(true);
    },
    [setSyncModalVisible]
  );

  const openSyncModalFromHeader = useCallback(() => openSyncModal('header'), [openSyncModal]);

  useEffect(() => {
    if (syncEntryRequestNonce <= lastSyncEntryNonceRef.current) {
      return;
    }
    lastSyncEntryNonceRef.current = syncEntryRequestNonce;
    if (syncHighlightScheduleTimerRef.current) {
      clearTimeout(syncHighlightScheduleTimerRef.current);
      syncHighlightScheduleTimerRef.current = null;
    }
    if (enableSyncAuthRetryTimerRef.current) {
      clearTimeout(enableSyncAuthRetryTimerRef.current);
      enableSyncAuthRetryTimerRef.current = null;
    }
    enableSyncShimmerAuthRetryRef.current = 0;
    setEnableSyncLabelShimmer(false);
    openSyncModal('deeplink');
  }, [syncEntryRequestNonce, openSyncModal]);

  const onEnableSyncLabelShimmerComplete = useCallback(() => {
    setEnableSyncLabelShimmer(false);
    void recordSyncShimmerImpression();
  }, []);

  useEffect(() => {
    if (settingsRoute != null) {
      Keyboard.dismiss();
    }
  }, [settingsRoute]);

  const onStreamEntryPress = useCallback((entry: Entry, anchor?: ThoughtSheetOpenAnchor) => {
    void recordOpenedExistingThoughtForSyncHighlight().then(() => {
      setSyncHighlightTick((n) => n + 1);
    });
    openReadEntrySheet(entry, anchor ?? null);
  }, [openReadEntrySheet]);

  const dismissEchoSwipeHint = useCallback(() => {
    setEchoSwipeHintVisible(false);
    void setEchoSwipeHintDismissed();
  }, []);

  const onEchoDismiss = useCallback(() => {
    const id = echoCandidatesRef.current[0]?.id;
    if (id) {
      void markAsShown(id);
      void recordEchoCandidatesDisplayed([id]);
    }
    setEchoCandidates([]);
  }, []);

  const onEchoEntryPress = useCallback((entry: EchoCandidate, anchor?: ThoughtSheetOpenAnchor) => {
    if (analyticsEnabled) {
      track({ event: 'echo_entry_opened' });
    }
    void recordOpenedExistingThoughtForSyncHighlight().then(() => {
      setSyncHighlightTick((n) => n + 1);
    });
    openReadEntrySheet(entry, anchor ?? null, { enterProfile: 'echo', resumeOnOpen: true });
  }, [analyticsEnabled, openReadEntrySheet]);

  const onReadEntryUpdated = useCallback((updated: Entry) => {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    setSearchResults((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }, []);

  const onVoiceTranscriptPartial = useCallback((partial: string) => {
    setText(mergeVoiceTranscript(voiceCaptureBaseRef.current, partial));
  }, []);

  const onVoiceTranscriptFinal = useCallback(
    (spoken: string, _reason: string) => {
      setText(mergeVoiceTranscript(voiceCaptureBaseRef.current, spoken));
      if (hapticsEnabled) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [hapticsEnabled],
  );

  const onVoiceCaptureError = useCallback((code: string) => {
    if (code !== 'permission_denied') {
      return;
    }
    Alert.alert(
      'Microphone access is off',
      'Enable microphone and speech recognition in iOS Settings to use voice capture.',
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
  }, []);

  const {
    phase: voicePhase,
    start: startVoiceCaptureSession,
    stop: stopVoiceCaptureSession,
    supported: voiceCaptureNativeReady,
  } = useVoiceCapture({
    onTranscriptPartial: onVoiceTranscriptPartial,
    onTranscriptFinal: onVoiceTranscriptFinal,
    onError: onVoiceCaptureError,
  });

  const showVoiceCapture = voiceCaptureNativeReady;

  useEffect(() => {
    if (!voiceCaptureRequestNonce || voiceCaptureRequestNonce <= lastVoiceRequestNonceRef.current) {
      return;
    }
    lastVoiceRequestNonceRef.current = voiceCaptureRequestNonce;
    requestAnimationFrame(() => {
      focusCaptureComposer();
    });
    if (showVoiceCapture && voicePhase !== 'listening') {
      voiceCaptureBaseRef.current = text;
      void startVoiceCaptureSession();
    }
  }, [
    showVoiceCapture,
    startVoiceCaptureSession,
    text,
    focusCaptureComposer,
    voiceCaptureRequestNonce,
    voicePhase,
  ]);

  /** Empty-stream art fades while the user composes so capture stays visually primary. */
  const streamEmptyAmbientSuppressed =
    text.trim().length > 0 || voicePhase === 'listening';

  /**
   * Empty stream: no auto keyboard until reveal prefs allow it and the user has focused the composer once
   * (first install stays tap-to-type; later opens can be capture-first).
   */
  const deferKeyboardForFirstLaunchReveal =
    streamDisplayEntries.length === 0 && (firstLaunchRevealDone !== true || !composerHasFocusedOnce);

  const onCaptureComposerFocus = useCallback(() => {
    setSuppressComposerAutoFocus(false);
    searchInputRef.current?.blur();
    if (composerHasFocusedOnce) {
      return;
    }
    void setFirstLaunchComposerHasFocused();
    setComposerHasFocusedOnce(true);
  }, [composerHasFocusedOnce]);

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    void saveEntry(trimmed)
      .then(async (entry) => {
        setText('');
        requestAnimationFrame(() => {
          focusCaptureComposer();
        });
        const nextEntries = [entry, ...entries.filter((e) => e.id !== entry.id)];
        setEntries(nextEntries);
        onScheduleStreamHighlight?.(entry.id);
        const sq = searchQueryRef.current.trim();
        if (sq) {
          void runSearch(sq);
        }
        void refreshUploadPending();
        const hint = getCaptureContinuationHint(nextEntries, trimmed, entry.id);
        setCaptureContinuationHint(hint);
        await playThoughtSavedHaptic();
      })
      .catch((err) => {
        if (__DEV__) {
          console.warn('saveEntry failed', err);
        }
      });
  }, [
    text,
    entries,
    runSearch,
    onScheduleStreamHighlight,
    refreshUploadPending,
    focusCaptureComposer,
    playThoughtSavedHaptic,
  ]);

  /** Taller composer so capture reads clearly as the primary surface on device. */
  const composerMinHeight = 76;
  const composerMaxHeight = 120;
  const capturePlaceholderColor = t.colors.capturePlaceholder;
  /** Empty field: show mic; typing: step aside; voice active: keep mic reachable. */
  const composerActionClusterOpen = composerActionClusterExpanded(text, voicePhase);
  const showStreamPullSearchHint =
    streamDisplayEntries.length > 0 && !searchExpanded && searchPullProgress > 0;
  const headerLogoColor = t.colors.logoMark;

  useEffect(() => {
    Animated.timing(composerActionClusterPresence, {
      toValue: composerActionClusterOpen ? 1 : 0,
      duration: motion.capture.relaxed,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [composerActionClusterOpen, composerActionClusterPresence]);

  const composerActionClusterWidth = composerActionClusterPresence.interpolate({
    inputRange: [0, 1],
    outputRange: [0, COMPOSER_ACTION_CLUSTER_WIDTH],
  });
  const composerActionClusterLeadingGap = composerActionClusterPresence.interpolate({
    inputRange: [0, 1],
    outputRange: [0, COMPOSER_ACTION_CLUSTER_LEADING_GAP],
  });
  const composerActionClusterOpacity = composerActionClusterPresence.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0, 0, 1],
  });
  const headerLogoSize = 42;
  /** Ring geometry: align **outer ring** with search field (gutter only); composer is inset +`screenContentInnerPad`. */
  const headerLogoAlignStyle = { marginLeft: -chinottoLogoLeadingOutset(headerLogoSize) };

  const searchActive = searchTrimmed.length > 0;
  const echoCandidatesForUi = useMemo(
    () => ensureEchoCandidatesForDev(echoCandidates, streamDisplayEntries),
    [echoCandidates, streamDisplayEntries],
  );
  const echoLayerEligible = isEchoLayerMountedForCapture({
    active: ECHO_LAYER_ACTIVE,
    searchActive,
    readSheetOpen: readEntry != null,
    totalEntryCount: Math.max(totalEntryCount, streamDisplayEntries.length),
    candidateCount: echoCandidatesForUi.length,
  });
  const echoPagerInteractive = isEchoPagerInteractive({
    eligible: echoLayerEligible,
    searchActive,
    readSheetOpen: readEntry != null,
    onEchoPage: echoPageIndex === 1,
  });
  const echoOnEchoPage = echoPageIndex === 1 && echoLayerEligible;
  const echoChrome = useMemo(() => echoChromeFromTheme(t), [t]);

  useEffect(() => {
    echoCandidatesRef.current = echoCandidatesForUi;
  }, [echoCandidatesForUi]);

  const echoEmotionalIntensity = useMemo(
    () => echoEmotionalIntensityFromEntries(echoCandidatesForUi),
    [echoCandidatesForUi],
  );

  useLayoutEffect(() => {
    if (echoLayerEligible && echoPageWidth > 0) {
      echoPagerScrollX.setValue(streamEchoPagerHomeOffset(echoPageWidth));
    }
  }, [echoLayerEligible, echoPagerScrollX, echoPageWidth]);

  useLayoutEffect(() => {
    if (echoOnEchoPage) {
      stashSearchForEchoNavigation();
    }
  }, [echoOnEchoPage, stashSearchForEchoNavigation]);

  /** Search recall replaces capture at full presence — no competing dim on the top row. */
  const composerDimFromSearch = 1;

  const composerOpacity = useMemo(() => {
    if (!echoLayerEligible || echoPageWidth <= 0) {
      return composerSearchDim;
    }
    const releaseAt = echoPageWidth * ECHO_COMPOSER_DIM_RELEASE_AT;
    const echoFactor = echoPagerScrollX.interpolate({
      inputRange: [0, releaseAt, echoPageWidth],
      outputRange: [ECHO_COMPOSER_DIM_AT_FULL, ECHO_COMPOSER_DIM_AT_FULL, 1],
      extrapolate: 'clamp',
    });
    return Animated.multiply(composerSearchDim, echoFactor);
  }, [composerSearchDim, echoLayerEligible, echoPageWidth, echoPagerScrollX]);

  useEffect(() => {
    Animated.timing(composerSearchDim, {
      toValue: composerDimFromSearch,
      duration: motion.capture.relaxed,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [composerDimFromSearch, composerSearchDim]);

  const onEchoPagerPageChange = useCallback(
    (index: 0 | 1) => {
      if (echoPagerPageSettledRef.current && echoPageIndexRef.current !== index) {
        playSearchChromeHaptic();
        if (index === 1) {
          dismissEchoSwipeHint();
          if (analyticsEnabled) {
            track({ event: 'echo_layer_revealed' });
          }
          const ids = echoCandidatesRef.current.map((c) => c.id);
          if (ids.length > 0) {
            void markAsShown(ids[0]!);
          }
          void recordEchoCandidatesDisplayed(ids).catch(() => {});
        }
      }
      echoPagerPageSettledRef.current = true;
      echoPageIndexRef.current = index;
      if (index === 1) {
        stashSearchForEchoNavigation();
      }
      setEchoPageIndex(index);
    },
    [analyticsEnabled, dismissEchoSwipeHint, playSearchChromeHaptic, stashSearchForEchoNavigation],
  );

  useEffect(() => {
    if (!echoLayerEligible || searchRecallMode || echoOnEchoPage) {
      setEchoSwipeHintVisible(false);
      return;
    }
    let cancelled = false;
    void getEchoSwipeHintDismissed().then((dismissed) => {
      if (!cancelled) {
        setEchoSwipeHintVisible(!dismissed);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [echoLayerEligible, echoOnEchoPage, searchRecallMode]);

  const tryEchoEdgePeek = useCallback(async () => {
    if (
      !echoLayerEligible ||
      echoPageWidth <= 0 ||
      readEntry != null ||
      searchActive ||
      !allowCaptureFocus ||
      text.trim().length > 0
    ) {
      return;
    }
    if (echoEdgePeekInFlightRef.current) {
      return;
    }
    if (!(await shouldOfferEchoEdgePeek())) {
      return;
    }
    echoEdgePeekInFlightRef.current = true;
    try {
      const result = await runEchoEdgePeekAnimation({
        pager: streamEchoPagerRef.current,
        respectReduceMotion: true,
      });
      if (result === 'played') {
        await setEchoEdgePeekLastAt();
      }
    } finally {
      echoEdgePeekInFlightRef.current = false;
    }
  }, [
    allowCaptureFocus,
    echoLayerEligible,
    echoPageWidth,
    readEntry,
    searchActive,
    text,
  ]);

  useEffect(() => {
    if (!echoLayerEligible || echoPageWidth <= 0) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) {
        void tryEchoEdgePeek();
      }
    }, ECHO_EDGE_PEEK_INITIAL_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [echoLayerEligible, echoPageWidth, tryEchoEdgePeek]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        void tryEchoEdgePeek();
      }
    });
    return () => sub.remove();
  }, [tryEchoEdgePeek]);

  const playEchoEdgePeekPreview = useCallback(async () => {
    setSettingsRoute(null);
    if (!echoLayerEligible) {
      Alert.alert(
        'Echo edge peek',
        'Echo is not mounted — need 8+ entries and a recall candidate; close search and any open thought.',
      );
      return;
    }
    const result = await runEchoEdgePeekAnimation({
      pager: streamEchoPagerRef.current,
      respectReduceMotion: false,
    });
    if (result === 'skipped_no_pager') {
      Alert.alert('Echo edge peek', 'Pager is not ready — return to capture and try again.');
    }
  }, [echoLayerEligible]);

  const resetEchoEdgePeekForDev = useCallback(() => {
    void clearEchoEdgePeekDone().then(() => {
      Alert.alert(
        'Echo edge peek',
        'Peek schedule cleared. Auto peek will run again when Echo is eligible.',
      );
    });
  }, []);

  const openDevMenuFromSettings = useCallback(() => {
    if (!__DEV__ || Platform.OS !== 'ios') {
      return;
    }
    showDevMenu({
      onResetPaywallForPurchaseTesting: () => void resetPaywallForPurchaseTesting(),
      onPreviewSyncEnabledSheet: () => {
        setDevPostSyncPreviewNonce((n) => n + 1);
        openSyncModal('dev_menu');
      },
      onResetAnalyticsPrompt: onResetAnalyticsPrompt,
      onResetSyncCaptureQA: () => {
        Keyboard.dismiss();
        if (firstLaunchFocusTimerRef.current) {
          clearTimeout(firstLaunchFocusTimerRef.current);
          firstLaunchFocusTimerRef.current = null;
        }
        firstLaunchPrefsLoadGenerationRef.current += 1;
        splashFocusPendingRef.current = true;
        void (async () => {
          await resetSyncHeaderShimmerPrefsForDev();
          await clearFirstLaunchEmptyCaptureRevealDone();
          setFirstLaunchRevealDone(false);
          setComposerHasFocusedOnce(false);
          setFirstLaunchRevealDevResetNonce((n) => n + 1);
          DevSettings.reload();
        })();
      },
      onPreviewAppUpdateModal: onDevPreviewAppUpdate,
      onPreviewEchoEdgePeek: playEchoEdgePeekPreview,
      onResetEchoEdgePeek: resetEchoEdgePeekForDev,
    });
  }, [
    onDevPreviewAppUpdate,
    onResetAnalyticsPrompt,
    openSyncModal,
    playEchoEdgePeekPreview,
    resetEchoEdgePeekForDev,
  ]);

  const temporalScrubberEligible = isTemporalScrubberEligible({
    active: TEMPORAL_NAV_ENABLED,
    searchActive: recallSearchActive,
    readSheetOpen: readEntry != null,
    totalEntryCount,
    hasStreamRows: streamDisplayEntries.length > 0,
  });
  const showTemporalScrubber = echoPageIndex === 0 && temporalScrubberEligible;
  const referenceMonthKey = monthKeyFromIso(new Date().toISOString());
  const visibleMonthKey =
    streamActiveEntry != null
      ? monthKeyFromIso(streamActiveEntry.createdAt)
      : streamDisplayEntries[0] != null
        ? monthKeyFromIso(streamDisplayEntries[0].createdAt)
        : referenceMonthKey;
  const temporalChromeMonthKey = temporalCommittedMonthKey ?? visibleMonthKey;

  const playTemporalBoundaryHaptic = useCallback(() => {
    if (!hapticsEnabled || Platform.OS === 'web') {
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [hapticsEnabled]);

  const jumpToMonth = useCallback(
    (monthKey: MonthKey, options?: { evenIfCurrent?: boolean; animated?: boolean }) => {
      if (!options?.evenIfCurrent && monthKey === temporalChromeMonthKey) {
        return;
      }
      streamScrollAnimatedRef.current = options?.animated ?? true;
      temporalPreviewMonthRef.current = monthKey;
      setTemporalCommittedMonthKey(monthKey);
      setTemporalRackAtCapture(false);
      setTemporalMapVisible(false);
      void (async () => {
        try {
          let anchor: Entry | null = null;
          let merged: Entry[] = entriesRef.current;

          if (demoStreamMode) {
            const demoRows = mergeDemoStreamWithEntries(entriesRef.current, true);
            anchor = demoRows.find((e) => monthKeyFromIso(e.createdAt) === monthKey) ?? null;
          } else {
            anchor = await resolveMonthJumpAnchor(
              monthKey,
              entriesRef.current,
              monthSummariesRef.current,
            );
            if (anchor == null) {
              setTemporalCommittedMonthKey(null);
              return;
            }
            merged = await loadStreamUntilEntryIncluded(anchor, entriesRef.current);
          }

          if (anchor == null) {
            setTemporalCommittedMonthKey(null);
            return;
          }

          setStreamActiveEntry(anchor);
          if (!demoStreamMode) {
            setEntries(merged);
            setHasMore(true);
          }
          setScrollToEntryId(anchor.id);
          onScheduleStreamHighlight?.(anchor.id);
          setShowBackToNow(true);
        } catch (err) {
          setTemporalCommittedMonthKey(null);
          if (__DEV__) {
            console.warn('temporal month jump failed', err);
          }
        }
      })();
    },
    [demoStreamMode, onScheduleStreamHighlight, temporalChromeMonthKey],
  );

  useEffect(() => {
    if (temporalCommittedMonthKey == null) {
      return;
    }
    const activeMonth =
      streamActiveEntry != null ? monthKeyFromIso(streamActiveEntry.createdAt) : null;
    if (activeMonth === temporalCommittedMonthKey && scrollToEntryId == null) {
      setTemporalCommittedMonthKey(null);
    }
  }, [streamActiveEntry, scrollToEntryId, temporalCommittedMonthKey]);

  const onTemporalActiveMonthPress = useCallback(() => {
    playTemporalBoundaryHaptic();
    setTemporalMapVisible(true);
    void getMonthSummaries()
      .then(setMonthSummaries)
      .catch(() => {});
  }, [playTemporalBoundaryHaptic]);

  const onStreamSectionLabelLongPress = useCallback(() => {
    playTemporalBoundaryHaptic();
    setTemporalMapVisible(true);
    void getMonthSummaries()
      .then(setMonthSummaries)
      .catch(() => {});
  }, [playTemporalBoundaryHaptic]);

  const scrollToStreamNow = useCallback(() => {
    streamScrollViewRef.current?.scrollTo({ y: 0, animated: true });
    setStreamActiveEntry(streamDisplayEntries[0] ?? null);
    setTemporalCommittedMonthKey(null);
    setShowBackToNow(false);
  }, [streamDisplayEntries]);

  const onTemporalMapSelectMonth = useCallback(
    (monthKey: MonthKey) => {
      jumpToMonth(monthKey, { evenIfCurrent: true });
    },
    [jumpToMonth],
  );

  const onScrollToEntryOffset = useCallback((contentOffsetY: number) => {
    streamScrollViewRef.current?.scrollTo({
      y: Math.max(0, contentOffsetY - 8),
      animated: streamScrollAnimatedRef.current,
    });
  }, []);

  const onScrollToEntryComplete = useCallback(() => {
    setScrollToEntryId(null);
  }, []);

  const onTemporalMonthCommitted = useCallback(
    (monthKey: MonthKey) => {
      streamScrollAnimatedRef.current = true;
      jumpToMonth(monthKey);
    },
    [jumpToMonth],
  );

  const onTemporalMonthPreview = useCallback(
    (monthKey: MonthKey) => {
      jumpToMonth(monthKey, { evenIfCurrent: true, animated: false });
    },
    [jumpToMonth],
  );

  const showCaptureSyncHeader = Platform.OS === 'ios' && isFirebaseSyncConfigured();

  return (
    <View style={styles.shell}>
      <EchoSpatialBackground
        scrollX={echoPagerScrollX}
        pageWidth={echoPageWidth}
        echoMounted={echoLayerEligible}
        chrome={echoChrome}
        emotionalIntensity={echoEmotionalIntensity}
      />
      <SafeAreaView style={styles.safe} edges={['top', 'right', 'left']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          enabled={readEntry == null}
        >
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
                showCaptureSyncHeader && styles.headerReserveDevMenuTray,
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
              {showCaptureSyncHeader ? (
                <SyncHeaderStatus
                  phase={demoStreamMode ? 'signed_in' : authRestorePhase}
                  uploadPending={!demoStreamMode && authRestorePhase === 'signed_in' && uploadPending}
                  uploadStuck={!demoStreamMode && authRestorePhase === 'signed_in' && uploadStuck}
                  onPress={openSyncModalFromHeader}
                  enableSyncLabelShimmer={enableSyncLabelShimmer}
                  onEnableSyncLabelShimmerComplete={onEnableSyncLabelShimmerComplete}
                  style={[styles.syncAfterLogo, { marginLeft: spacing.xs }]}
                />
              ) : null}
            </View>
          </View>
          <View style={{ paddingHorizontal: gutter, zIndex: searchRecallMode ? 2 : 0 }}>
            <Animated.View style={[styles.composerBlock, { opacity: composerOpacity }]}>
              {searchRecallMode ? (
                <View testID="stream-search-mode">
                  <StreamSearchField
                    ref={searchInputRef}
                    glassSticky
                    expanded
                    focused={searchFocused}
                    value={searchQuery}
                    onChangeText={onSearchChangeText}
                    onFocus={onSearchFocus}
                    onBlur={onSearchBlur}
                    onPressExpand={expandSearch}
                    onPressClose={collapseSearch}
                    resultLabel={searchResultLabel}
                  />
                </View>
              ) : (
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
                        allowCaptureFocus &&
                        !deferKeyboardForFirstLaunchReveal &&
                        readEntry == null &&
                        !echoOnEchoPage &&
                        !recallSearchActive &&
                        !suppressComposerAutoFocus
                      }
                      editable={readEntry == null && !echoOnEchoPage && !recallSearchActive}
                      showSoftInputOnFocus={
                        readEntry == null && !echoOnEchoPage && !recallSearchActive
                      }
                    />
                  </View>
                  <Animated.View
                    testID="composer-action-cluster"
                    pointerEvents={composerActionClusterOpen ? 'auto' : 'none'}
                    accessibilityElementsHidden={!composerActionClusterOpen}
                    importantForAccessibility={
                      composerActionClusterOpen ? 'auto' : 'no-hide-descendants'
                    }
                    style={[
                      styles.composerActionCluster,
                      {
                        width: composerActionClusterWidth,
                        marginLeft: composerActionClusterLeadingGap,
                        opacity: composerActionClusterOpacity,
                        paddingTop: VOICE_MIC_CLUSTER_OVERFLOW_PAD_TOP,
                      },
                    ]}
                  >
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
                  </Animated.View>
                </View>
              )}
            </Animated.View>
            <EchoSwipeRecallHint
              visible={
                echoLayerEligible &&
                echoSwipeHintVisible &&
                !searchRecallMode &&
                echoPageIndex === 0 &&
                readEntry == null
              }
              onDismiss={dismissEchoSwipeHint}
            />
            {captureContinuationHint && !searchRecallMode && readEntry == null ? (
              <CaptureContinuationHint
                hint={captureContinuationHint}
                onOpen={() => {
                  const target = entries.find((e) => e.id === captureContinuationHint.entry_id);
                  if (target) {
                    setCaptureContinuationHint(null);
                    openReadEntrySheet(target, null, { enterProfile: 'stream' });
                  }
                }}
                onDismiss={() => setCaptureContinuationHint(null)}
              />
            ) : null}
          </View>
          <View style={styles.flex}>
          <StreamEchoPager
            ref={streamEchoPagerRef}
            pageWidth={echoPageWidth}
            echoMounted={echoLayerEligible}
            pagerInteractive={echoPagerInteractive}
            scrollX={echoLayerEligible ? echoPagerScrollX : undefined}
            onPageIndexChange={onEchoPagerPageChange}
            echo={
              <EchoPageShell
                candidates={echoCandidatesForUi}
                onEntryPress={onEchoEntryPress}
                onDismiss={onEchoDismiss}
                scrollX={echoLayerEligible ? echoPagerScrollX : undefined}
                pageWidth={echoPageWidth}
                uiVariant={ECHO_UI_VARIANT_SHIPPED}
                recallDim={echoRecallDim}
                onEchoPage={echoOnEchoPage}
              />
            }
          >
            <View style={styles.captureStreamStack}>
                <ScrollView
                  testID="capture-stream-scroll"
                  ref={streamScrollViewRef}
                  style={styles.scrollFlex}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                  nestedScrollEnabled
                  directionalLockEnabled
                  bounces
                  overScrollMode="always"
                  scrollEventThrottle={16}
                  onScroll={handleScroll}
                  onScrollBeginDrag={handleScrollBeginDrag}
                  onScrollEndDrag={handleScrollEndDrag}
                  onLayout={(e) => setStreamViewportHeight(e.nativeEvent.layout.height)}
                  contentContainerStyle={[
                    styles.scrollContent,
                    {
                      flexGrow: 1,
                      paddingBottom: Math.max(insets.bottom, spacing.sm) + spacing.xl,
                    },
                  ]}
                >
                  {showStreamPullSearchHint ? (
                    <View
                      testID="stream-pull-search-hint"
                      pointerEvents="none"
                      style={[
                        styles.streamPullSearchHint,
                        { opacity: searchPullProgress * 0.55 },
                      ]}
                    >
                      <StreamSearchGlyph color={t.colors.muted} size={13} />
                    </View>
                  ) : null}
                  <RecentList
                    entries={searchTrimmed.length > 0 ? searchResults : streamDisplayEntries}
                    visible
                    deferEmptyStreamMotion={!allowCaptureFocus}
                    streamEmptyAmbient={searchTrimmed.length === 0 && streamDisplayEntries.length === 0}
                    streamEmptyAmbientSuppressed={streamEmptyAmbientSuppressed}
                    streamScrollY={streamScrollY}
                    streamViewportHeight={streamViewportHeight}
                    streamScrollViewRef={streamScrollViewRef as unknown as RefObject<View | null>}
                    streamViewportFocusEnabled={
                      searchTrimmed.length > 0 ? searchResults.length > 0 : streamDisplayEntries.length > 0
                    }
                    highlightEntryId={searchTrimmed.length > 0 ? null : streamHighlightEntryId}
                    searchHighlightQuery={searchTrimmed.length > 0 ? searchTrimmed : undefined}
                    emptyHint={
                      searchTrimmed.length > 0
                        ? undefined
                        : streamDisplayEntries.length === 0
                          ? 'Write it down.\nIt stays.'
                          : undefined
                    }
                    listFooterHint={
                      searchTrimmed.length > 0 && searchTruncated
                        ? `Showing first ${SEARCH_MAX_RESULTS} matches`
                        : undefined
                    }
                    onEntryPress={onStreamEntryPress}
                    onEntryDelete={handleEntryDelete}
                    threadPeelEnabled={searchTrimmed.length === 0 && echoPageIndex === 0}
                    threadPeelSourceEntries={streamDisplayEntries}
                    onSectionLabelLongPress={
                      searchTrimmed.length === 0 ? onStreamSectionLabelLongPress : undefined
                    }
                    onActiveStreamEntryChange={
                      searchActive || temporalRackScrubbing ? undefined : setStreamActiveEntry
                    }
                    scrollToEntryId={scrollToEntryId}
                    streamScrollYRef={streamScrollYRef}
                    onScrollToEntryOffset={onScrollToEntryOffset}
                    onScrollToEntryComplete={onScrollToEntryComplete}
                    streamLoadingMore={streamLoadingMore}
                    streamScrollVelocityY={streamScrollVelocityY}
                  />
                  <Pressable
                    style={[styles.bottomFill, { flexGrow: 1, minHeight: 1 }]}
                    accessible={false}
                    onPress={Keyboard.dismiss}
                  />
                </ScrollView>
                {temporalScrubberEligible ? (
                  <TemporalMonthRack
                    months={monthSummaries}
                    streamMonthKey={temporalChromeMonthKey}
                    visible={showTemporalScrubber}
                    rightInset={TEMPORAL_TRAILING_CHROME_RIGHT_INSET}
                    bottomInset={TEMPORAL_RACK_BOTTOM_INSET + insets.bottom}
                    onScrubbingChange={setTemporalRackScrubbing}
                    onMonthPreview={onTemporalMonthPreview}
                    onMonthCommitted={onTemporalMonthCommitted}
                    onActiveMonthPress={onTemporalActiveMonthPress}
                    hapticsEnabled={hapticsEnabled}
                    onMonthBoundaryHaptic={playTemporalBoundaryHaptic}
                  />
                ) : null}
                <StreamBackToNowPill visible={showBackToNow} onPress={scrollToStreamNow} />
              </View>
          </StreamEchoPager>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      {settingsRoute === 'settings' ? (
        <SettingsScreen
          onClose={() => setSettingsRoute(null)}
          onOpenSync={() => openSyncModal('settings')}
          analyticsEnabled={analyticsEnabled}
          onAnalyticsOptInChange={onAnalyticsOptInChange}
          onOpenManifesto={() => setSettingsRoute('manifesto')}
          canOpenAppIcon={ENABLE_APP_ICON_SWITCHER}
          onOpenAppIcon={
            ENABLE_APP_ICON_SWITCHER
              ? () => setSettingsRoute('app_icon')
              : undefined
          }
          appIconLabel={ENABLE_APP_ICON_SWITCHER ? getAppIconVariant(appIconVariantId).name : undefined}
          syncStatusLabel={
            authRestorePhase === 'restoring'
              ? 'Checking sync'
              : authRestorePhase === 'signed_in'
                ? uploadStuck
                  ? 'Sync paused'
                  : uploadPending
                    ? 'Syncing…'
                    : 'Sync on'
                : 'Off'
          }
          onOpenDevMenu={__DEV__ && Platform.OS === 'ios' ? openDevMenuFromSettings : undefined}
          accountSectionVisible={
            Platform.OS === 'ios' &&
            isFirebaseSyncConfigured() &&
            (__DEV__ || authRestorePhase === 'signed_in')
          }
          accountIdentityLabel={firebaseAccountLabel ?? 'Apple ID'}
          onOpenDeleteAccount={() => setAccountDeletionOpen(true)}
        />
      ) : null}
      <Modal
        visible={accountDeletionOpen}
        animationType="fade"
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : 'fullScreen'}
        statusBarTranslucent
        onRequestClose={() => setAccountDeletionOpen(false)}
      >
        <DeleteAccountScreen
          visible={accountDeletionOpen}
          onClose={() => setAccountDeletionOpen(false)}
          onAccountDeleted={() => {
            setAccountDeletionOpen(false);
            setSettingsRoute(null);
            Alert.alert('', 'Your account has been deleted.');
          }}
        />
      </Modal>
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
      <EntryThoughtSheet
        visible={readEntry != null}
        entry={readEntry}
        openAnchor={readEntryAnchor}
        onClose={() => {
          if (readEntryEnterProfile === 'echo') {
            echoRecallDim.stopAnimation();
            Animated.sequence([
              Animated.delay(ECHO_RECALL_DIM_OUT_DELAY_MS),
              Animated.timing(echoRecallDim, {
                toValue: 1,
                duration: ECHO_RECALL_DIM_OUT_MS,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
            ]).start();
          }
          setReadEntry(null);
          setReadEntryAnchor(null);
          setReadEntryHapticOnPresent(false);
          setReadEntryEnterProfile('stream');
          setReadEntryResumeOnOpen(false);
          setSuppressComposerAutoFocus(true);
        }}
        enterProfile={readEntryEnterProfile}
        resumeOnOpen={readEntryResumeOnOpen}
        onEntryUpdated={onReadEntryUpdated}
        onTrailEntrySelect={(next) =>
          openReadEntrySheet(next, null, { enterProfile: readEntryEnterProfile })
        }
        hapticsEnabled={hapticsEnabled}
        hapticOnPresent={readEntryHapticOnPresent}
      />
      <TemporalMapSheet
        visible={temporalMapVisible}
        months={monthSummaries}
        highlightedMonthKey={temporalChromeMonthKey}
        onClose={() => setTemporalMapVisible(false)}
        onSelectMonth={onTemporalMapSelectMonth}
        hapticsEnabled={hapticsEnabled}
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
  captureStreamStack: {
    flex: 1,
    position: 'relative',
  },
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
  /** Horizontal gap logo → label: same as Settings header (logo → “Settings”). */
  syncAfterLogo: {
    paddingVertical: 6,
    paddingRight: 4,
  },
  bottomFill: {},
  /** No fill — only rhythm; capture reads against AmbientBackground. */
  composerBlock: {
    paddingHorizontal: screenContentInnerPad,
    paddingTop: 14,
    /** Tighter than top — stream sits closer without compressing capture. */
    paddingBottom: 6,
  },
  composerInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  composerInputWrap: {
    flex: 1,
    minWidth: 0,
  },
  /** Mic only; width animates to 0 so the thought can use the full row. */
  composerActionCluster: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    overflow: 'hidden',
  },
  streamPullSearchHint: {
    alignItems: 'center',
    paddingBottom: 6,
    marginTop: -4,
  },
});
