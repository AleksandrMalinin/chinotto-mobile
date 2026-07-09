import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  clearAnalyticsPromptShown,
  getAnalyticsPromptShown,
  initAnalyticsOptIn,
  isOptIn,
  isUmamiConfigured,
  setAnalyticsPromptShown,
  setOptIn,
  setUmami,
} from './analytics/analytics';
import { isMobileSyncPlatform } from './auth/syncPlatform';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useIncomingShare } from 'expo-sharing';
import {
  AccessibilityInfo,
  AppState,
  type AppStateStatus,
  DevSettings,
  Linking,
  LogBox,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandSplash } from './components/BrandSplash';
import { UpdateScreen } from './components/UpdateScreen';
import { STREAM_HIGHLIGHT_CLEAR_AFTER_MS } from './components/RecentList';
import { CaptureScreen } from './screens/CaptureScreen';
import { loadSubscriptionState } from './monetization/subscriptionState';
import { bootstrapRevenueCat } from './src/services/purchases/initRevenueCat';
import { isRevenueCatQuietMode } from './src/services/purchases/revenueCatQuiet';
import { composeIncomingShareCaptureText } from './share/extractShareEntryTexts';
import { shouldDeferShareAck } from './share/shareAckTiming';
import { shouldRunMobileFirestoreIngest } from './sync/ingestGate';
import { startMobileFirestoreIngest } from './sync/firestoreIngest';
import {
  createDebouncedRemoteIngestNotifier,
  REMOTE_INGEST_AFTER_SYNC_MODAL_MS,
} from './sync/remoteIngestStreamNotify';
import { resolvePushEntryForSync } from './sync/pushEntryForSync';
import { startBackgroundSync } from './sync/syncEngine';
import { useSyncDeepLink } from './linking/useSyncDeepLink';
import { useAppUpdateCheck } from './src/services/appUpdate/useAppUpdateCheck';
import { initDatabase } from './storage/db';
import {
  getDisplayChromePreference,
  setDisplayChromePreference as persistDisplayChromePreference,
  type DisplayChromePreference,
} from './storage/displayChromePrefs';
import { saveEntry } from './storage/entryRepository';
import { incrementAppLaunchCountForSyncHighlight } from './storage/syncHighlightSignals';
import { useAdaptiveChromeBlend } from './hooks/useAdaptiveChromeBlend';
import { isFirebaseSyncConfigured } from './sync/firebaseConfig';
import { mirrorChinottoSyncAccessToFirestore } from './sync/firestoreSyncAccessMirror';
import { refreshWidgetThoughtsFromLocalDb } from './widgets/widgetThoughtsBridge';
import { useCaptureWidgetDeepLinkFocus } from './widgets/useCaptureWidgetDeepLinkFocus';
import { useExperimentalIosHomeWidgetRegistration } from './widgets/useExperimentalIosHomeWidget';
import { AdaptiveChromeContext, useAppTheme } from './theme';

/** Keep native splash visible until we call hide (fonts + DB + short beat). */
void SplashScreen.preventAutoHideAsync();

if (__DEV__ && isRevenueCatQuietMode()) {
  LogBox.ignoreLogs([/\[RevenueCat\]/, /RevenueCat/]);
}

/**
 * Delay before mounting BrandSplash. Native splash stays up until BrandSplash’s first
 * `onLayout` calls `SplashScreen.hideAsync()` so the JS logo is already positioned underneath.
 */
const NATIVE_SPLASH_BEAT_MS = 400;
/**
 * Normal order (independent timers; all optional):
 *
 * 1. **Contextual Enable sync shimmer** — after local relevance + cooldown (see `getSyncHighlightEligibility`
 *    + `SYNC_HIGHLIGHT_SCHEDULE_DELAY_MS` in `CaptureScreen`), never on first cold launch.
 * 2. **First saved thought** — `CaptureScreen` calls `onAnalyticsPresentationGateReady` → after this delay,
 *    the Umami opt-in sheet may open (if configured and not already shown).
 */
const ANALYTICS_OPTIN_DELAY_MS = 4000;
/** Wait for expo-sharing to finish resolving multi-part payloads before one save. */
const SHARE_SAVE_DEBOUNCE_MS = 400;

type AppPhase = 'boot' | 'brand' | 'main';

function ShareSavedAck({ visible }: { visible: boolean }) {
  const insets = useSafeAreaInsets();
  const t = useAppTheme();
  if (!visible) {
    return null;
  }
  return (
    <View
      pointerEvents="none"
      style={[
        shareAckStyles.anchor,
        {
          bottom: insets.bottom + 20,
          zIndex: 999,
        },
      ]}
    >
      <View
        style={[
          shareAckStyles.pill,
          {
            backgroundColor: t.colors.bgElevated,
            borderColor: t.colors.border,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: t.sunlightMode ? 2 : 4 },
                shadowOpacity: t.sunlightMode ? 0.14 : 0.22,
                shadowRadius: t.sunlightMode ? 8 : 12,
              },
              android: {
                elevation: t.sunlightMode ? 3 : 5,
              },
              default: {},
            }),
          },
        ]}
      >
        <Text style={[shareAckStyles.label, { color: t.colors.fg }]}>Saved from share</Text>
      </View>
    </View>
  );
}

const shareAckStyles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  /** Soft confirmation — readable on the stream, minimal glow, no hard edge. */
  pill: {
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: '88%',
  },
  label: {
    fontSize: 15,
    fontFamily: 'OpenSauceOne-500',
    textAlign: 'center',
    letterSpacing: 0.15,
  },
});

/** One increment per JS session when capture shell mounts (Strict Mode–safe). */
let didIncrementAppLaunchThisSession = false;

export default function App() {
  const [fontsLoaded] = useFonts({
    'OpenSauceOne-400': require('./assets/fonts/OpenSauceOne-Regular.ttf'),
    'OpenSauceOne-500': require('./assets/fonts/OpenSauceOne-Medium.ttf'),
  });
  const [dbReady, setDbReady] = useState(false);
  const { blendProgress: adaptiveBlend, ready: chromeReady } = useAdaptiveChromeBlend();
  const [displayChrome, setDisplayChromeState] = useState<DisplayChromePreference>('auto');
  const [displayChromeReady, setDisplayChromeReady] = useState(false);

  useEffect(() => {
    void getDisplayChromePreference().then((p) => {
      setDisplayChromeState(p);
      setDisplayChromeReady(true);
    });
  }, []);

  const setDisplayChrome = useCallback((next: DisplayChromePreference) => {
    setDisplayChromeState(next);
    void persistDisplayChromePreference(next);
  }, []);

  const blendProgress = useMemo(() => {
    if (displayChrome === 'normal') {
      return 0;
    }
    if (displayChrome === 'sunlight') {
      return 1;
    }
    return adaptiveBlend;
  }, [displayChrome, adaptiveBlend]);
  const [subscriptionLoaded, setSubscriptionLoaded] = useState(false);
  const [firestoreIngestEpoch, setFirestoreIngestEpoch] = useState(0);
  const [remoteIngestVersion, setRemoteIngestVersion] = useState(0);
  const [phase, setPhase] = useState<AppPhase>('boot');
  const phaseRef = useRef<AppPhase>('boot');
  /** Bumps each time we start handling a non-empty share — avoids stale async after re-renders. */
  const shareSaveSessionRef = useRef(0);
  const [shareSavedAck, setShareSavedAck] = useState(false);
  /** When share save finishes during brand splash, defer toast until `main` (after splash). */
  const shareAckPendingRef = useRef(false);
  const [externalEntriesEpoch, setExternalEntriesEpoch] = useState(0);
  const [captureFocusNonce, setCaptureFocusNonce] = useState(0);
  const [voiceCaptureRequestNonce, setVoiceCaptureRequestNonce] = useState(0);
  const [thoughtEntryRequestId, setThoughtEntryRequestId] = useState<string | null>(null);
  const [streamHighlightEntryId, setStreamHighlightEntryId] = useState<string | null>(null);
  const streamHighlightClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [syncEntryRequestNonce, setSyncEntryRequestNonce] = useState(0);
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [analyticsInitDone, setAnalyticsInitDone] = useState(false);
  const [showAnalyticsOptIn, setShowAnalyticsOptIn] = useState(false);
  /** True once capture has at least one saved thought (see CaptureScreen analytics gate). */
  const [captureShellReadyForAnalytics, setCaptureShellReadyForAnalytics] = useState(false);
  const syncModalWasOpenRef = useRef(false);
  const remoteIngestNotifyRef = useRef<ReturnType<typeof createDebouncedRemoteIngestNotifier> | null>(
    null
  );
  if (remoteIngestNotifyRef.current == null) {
    remoteIngestNotifyRef.current = createDebouncedRemoteIngestNotifier(() => {
      setRemoteIngestVersion((v) => v + 1);
    });
  }
  const {
    resolvedSharedPayloads,
    sharedPayloads,
    isResolving,
    clearSharedPayloads,
    refreshSharePayloads,
  } = useIncomingShare();

  const { gate: appUpdateGate, dismissSoft: dismissAppUpdateSoft } = useAppUpdateCheck({
    enabled: true,
  });

  const [devAppUpdatePreview, setDevAppUpdatePreview] = useState<'soft' | 'forced' | null>(null);

  const showDevAppUpdate = __DEV__ && devAppUpdatePreview != null;
  const showProdAppUpdate = appUpdateGate != null;
  const updateModalVisible = showDevAppUpdate || showProdAppUpdate;
  const updateModalMode = showDevAppUpdate
    ? devAppUpdatePreview!
    : appUpdateGate?.kind === 'soft'
      ? 'soft'
      : 'forced';
  const updateModalTitle = showDevAppUpdate
    ? devAppUpdatePreview === 'forced'
      ? 'Update required'
      : 'New version available'
    : (appUpdateGate?.title ?? '');
  const updateModalMessage = showDevAppUpdate
    ? devAppUpdatePreview === 'forced'
      ? 'A newer version is needed.'
      : 'Stay current.'
    : (appUpdateGate?.message ?? '');
  const updateModalStoreUrl = showDevAppUpdate
    ? Platform.OS === 'ios'
      ? 'https://apps.apple.com/'
      : Platform.OS === 'android'
        ? 'https://play.google.com/store/apps/details?id=com.chinotto.mobile'
        : null
    : (appUpdateGate?.storeUrl ?? null);

  const onAppUpdateOpenStore = useCallback(() => {
    let url = appUpdateGate?.storeUrl ?? null;
    if ((url == null || url === '') && __DEV__ && devAppUpdatePreview != null) {
      url =
        Platform.OS === 'ios'
          ? 'https://apps.apple.com/'
          : Platform.OS === 'android'
            ? 'https://play.google.com/store/apps/details?id=com.chinotto.mobile'
            : null;
    }
    if (url == null || url === '') {
      return;
    }
    void Linking.openURL(url).catch((err) => {
      if (__DEV__) {
        console.warn('App update store URL failed', err);
      }
    });
  }, [appUpdateGate?.storeUrl, devAppUpdatePreview]);

  const onAppUpdateLater = useCallback(() => {
    if (__DEV__ && devAppUpdatePreview != null) {
      if (devAppUpdatePreview === 'soft') {
        setDevAppUpdatePreview(null);
      }
      return;
    }
    if (appUpdateGate?.kind === 'soft') {
      dismissAppUpdateSoft();
    }
  }, [appUpdateGate?.kind, devAppUpdatePreview, dismissAppUpdateSoft]);

  const onBrandFinished = useCallback(() => {
    setPhase('main');
  }, []);

  useEffect(() => {
    if (phase !== 'main') {
      return;
    }
    if (didIncrementAppLaunchThisSession) {
      return;
    }
    didIncrementAppLaunchThisSession = true;
    void incrementAppLaunchCountForSyncHighlight();
  }, [phase]);

  const scheduleStreamHighlight = useCallback((entryId: string) => {
    if (streamHighlightClearRef.current != null) {
      clearTimeout(streamHighlightClearRef.current);
    }
    setStreamHighlightEntryId(entryId);
    streamHighlightClearRef.current = setTimeout(() => {
      setStreamHighlightEntryId(null);
      streamHighlightClearRef.current = null;
    }, STREAM_HIGHLIGHT_CLEAR_AFTER_MS);
  }, []);

  useEffect(() => {
    void initDatabase().finally(() => setDbReady(true));
  }, []);

  useEffect(() => {
    if (!dbReady) {
      return;
    }
    void refreshWidgetThoughtsFromLocalDb();
  }, [dbReady]);

  useEffect(() => {
    if (!dbReady) {
      return undefined;
    }
    const onChange = (state: AppStateStatus) => {
      if (state === 'active') {
        void refreshWidgetThoughtsFromLocalDb();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [dbReady]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    const url = process.env.EXPO_PUBLIC_UMAMI_URL?.trim() || null;
    const id = process.env.EXPO_PUBLIC_UMAMI_WEBSITE_ID?.trim() || null;
    setUmami(url, id);
    void (async () => {
      await initAnalyticsOptIn();
      setAnalyticsEnabled(isOptIn());
      setAnalyticsInitDone(true);
    })();
  }, []);

  const onCaptureShellReadyForAnalytics = useCallback(() => {
    setCaptureShellReadyForAnalytics(true);
  }, []);

  const resetAnalyticsPromptForDev = useCallback(() => {
    void (async () => {
      await clearAnalyticsPromptShown();
      DevSettings.reload();
    })();
  }, []);

  useEffect(() => {
    if (!analyticsInitDone || phase !== 'main' || !captureShellReadyForAnalytics) {
      return undefined;
    }
    if (!isUmamiConfigured()) {
      return undefined;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    void (async () => {
      const shown = await getAnalyticsPromptShown();
      if (cancelled || shown) {
        return;
      }
      if (isOptIn()) {
        void setAnalyticsPromptShown();
        return;
      }
      timer = setTimeout(() => {
        if (!cancelled) {
          setShowAnalyticsOptIn(true);
        }
      }, ANALYTICS_OPTIN_DELAY_MS);
    })();

    return () => {
      cancelled = true;
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    };
  }, [phase, analyticsInitDone, captureShellReadyForAnalytics]);

  const onAnalyticsOptInChange = useCallback((enabled: boolean) => {
    setOptIn(enabled);
    setAnalyticsEnabled(enabled);
    if (enabled) {
      void setAnalyticsPromptShown();
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await bootstrapRevenueCat();
      await loadSubscriptionState();
      /** After RC + AsyncStorage hydration, `hasSyncAccess()` is accurate for mirror (paywall on). */
      if (isMobileSyncPlatform()) {
        void mirrorChinottoSyncAccessToFirestore();
      }
      setSubscriptionLoaded(true);
    })();
  }, []);

  useExperimentalIosHomeWidgetRegistration();

  useCaptureWidgetDeepLinkFocus({
    onCaptureDeepLink: useCallback(() => {
      setCaptureFocusNonce((n) => n + 1);
    }, []),
    onVoiceCaptureDeepLink: useCallback(() => {
      setCaptureFocusNonce((n) => n + 1);
      setVoiceCaptureRequestNonce((n) => n + 1);
    }, []),
    onThoughtDeepLink: useCallback((thoughtId: string) => {
      setThoughtEntryRequestId((current) => {
        if (current === thoughtId) {
          return null;
        }
        return thoughtId;
      });
      requestAnimationFrame(() => {
        setThoughtEntryRequestId(thoughtId);
      });
    }, []),
  });

  const bumpSyncEntryFromDeepLink = useCallback((_url: string) => {
    setSyncEntryRequestNonce((n) => n + 1);
  }, []);

  useSyncDeepLink({
    enabled: isMobileSyncPlatform(),
    phase,
    dbReady,
    subscriptionLoaded,
    onSyncDeepLink: bumpSyncEntryFromDeepLink,
  });

  useEffect(() => {
    if (!dbReady || isResolving) {
      return;
    }
    const resolved = resolvedSharedPayloads;
    const raw = sharedPayloads;
    const id = setTimeout(() => {
      const captureText = composeIncomingShareCaptureText(resolved, raw);
      if (captureText == null || captureText.trim() === '') {
        return;
      }
      const session = ++shareSaveSessionRef.current;
      void (async () => {
        let savedEntryId: string | null = null;
        try {
          const entry = await saveEntry(captureText);
          savedEntryId = entry.id;
        } catch (err) {
          if (__DEV__) {
            console.warn('Incoming share save failed', err);
          }
          return;
        }
        if (session !== shareSaveSessionRef.current) {
          return;
        }
        /**
         * `expo-sharing` keeps an internal ref of the last payloads and skips refresh when the new
         * batch is `sharePayloadsAreEqual` to it. After we clear native payloads, that ref must be
         * synced to `[]` — otherwise sharing the *same* URL again looks "unchanged" and never
         * re-resolves or updates React state (no second save, no toast).
         */
        clearSharedPayloads();
        try {
          await refreshSharePayloads();
        } catch (refreshErr) {
          if (__DEV__) {
            console.warn('refreshSharePayloads after share failed', refreshErr);
          }
        }
        if (session !== shareSaveSessionRef.current) {
          return;
        }
        setExternalEntriesEpoch((n) => n + 1);
        if (savedEntryId != null) {
          scheduleStreamHighlight(savedEntryId);
        }
        if (shouldDeferShareAck(phaseRef.current)) {
          shareAckPendingRef.current = true;
        } else {
          setShareSavedAck(true);
          AccessibilityInfo.announceForAccessibility?.('Thought saved from share');
        }
      })();
    }, SHARE_SAVE_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [
    dbReady,
    isResolving,
    resolvedSharedPayloads,
    sharedPayloads,
    clearSharedPayloads,
    refreshSharePayloads,
    scheduleStreamHighlight,
  ]);

  useEffect(() => {
    if (phase !== 'main' || !shareAckPendingRef.current) {
      return;
    }
    shareAckPendingRef.current = false;
    setShareSavedAck(true);
    AccessibilityInfo.announceForAccessibility?.('Thought saved from share');
  }, [phase]);

  useEffect(() => {
    if (!shareSavedAck) {
      return;
    }
    const id = setTimeout(() => setShareSavedAck(false), 2200);
    return () => clearTimeout(id);
  }, [shareSavedAck]);

  useEffect(() => {
    if (!dbReady || !subscriptionLoaded) {
      return;
    }
    let cancelled = false;
    let stop: (() => void) | undefined;

    void (async () => {
      if (cancelled) {
        return;
      }
      stop = startBackgroundSync({ pushEntry: resolvePushEntryForSync() }).stop;
    })();

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [dbReady, subscriptionLoaded]);

  useEffect(() => {
    if (!shouldRunMobileFirestoreIngest({ dbReady, subscriptionLoaded, syncModalVisible })) {
      syncModalWasOpenRef.current = syncModalVisible;
      return undefined;
    }

    const resumeAfterSyncModal = syncModalWasOpenRef.current && !syncModalVisible;
    syncModalWasOpenRef.current = syncModalVisible;

    let cancelled = false;
    let stopIngest: (() => void) | undefined;
    let startTimer: ReturnType<typeof setTimeout> | undefined;
    const notify = remoteIngestNotifyRef.current!;

    const runStart = () => {
      if (cancelled) {
        return;
      }
      stopIngest = startMobileFirestoreIngest(() => {
        notify.notify();
      });
    };

    if (resumeAfterSyncModal) {
      startTimer = setTimeout(runStart, REMOTE_INGEST_AFTER_SYNC_MODAL_MS);
    } else {
      runStart();
    }

    return () => {
      cancelled = true;
      if (startTimer !== undefined) {
        clearTimeout(startTimer);
      }
      notify.flush();
      stopIngest?.();
    };
  }, [dbReady, subscriptionLoaded, firestoreIngestEpoch, syncModalVisible]);

  useEffect(() => {
    if (!fontsLoaded || !dbReady) {
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    void (async () => {
      if (cancelled) {
        return;
      }
      timer = setTimeout(() => {
        setPhase('brand');
      }, NATIVE_SPLASH_BEAT_MS);
    })();
    return () => {
      cancelled = true;
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    };
  }, [fontsLoaded, dbReady]);

  if (!fontsLoaded || !dbReady || !chromeReady || !displayChromeReady || phase === 'boot') {
    return null;
  }

  return (
    <AdaptiveChromeContext.Provider value={{ blendProgress, displayChrome, setDisplayChrome }}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View style={{ flex: 1 }}>
            <StatusBar style="light" />
            <CaptureScreen
              allowCaptureFocus={
                phase === 'main' &&
                !showAnalyticsOptIn &&
                appUpdateGate?.kind !== 'forced' &&
                devAppUpdatePreview !== 'forced'
              }
              remoteIngestVersion={remoteIngestVersion}
              externalEntriesEpoch={externalEntriesEpoch}
              captureFocusNonce={captureFocusNonce}
              voiceCaptureRequestNonce={voiceCaptureRequestNonce}
              thoughtEntryRequestId={thoughtEntryRequestId}
              syncEntryRequestNonce={syncEntryRequestNonce}
              streamHighlightEntryId={streamHighlightEntryId}
              onScheduleStreamHighlight={scheduleStreamHighlight}
              subscriptionHydrated={subscriptionLoaded}
              onSubscriptionUnlocked={() => setFirestoreIngestEpoch((n) => n + 1)}
              syncModalVisible={syncModalVisible}
              onSyncModalVisibleChange={setSyncModalVisible}
              analyticsEnabled={analyticsEnabled}
              onAnalyticsOptInChange={onAnalyticsOptInChange}
              onAnalyticsPresentationGateReady={onCaptureShellReadyForAnalytics}
              onResetAnalyticsPrompt={__DEV__ && Platform.OS === 'ios' ? resetAnalyticsPromptForDev : undefined}
              onDevPreviewAppUpdate={__DEV__ && Platform.OS === 'ios' ? setDevAppUpdatePreview : undefined}
            />
            {phase === 'brand' ? <BrandSplash onFinished={onBrandFinished} /> : null}
            <AnalyticsOptInModal
              visible={showAnalyticsOptIn}
              onClose={() => {
                setShowAnalyticsOptIn(false);
                setAnalyticsEnabled(isOptIn());
              }}
            />
            <UpdateScreen
              visible={updateModalVisible}
              mode={updateModalMode}
              title={updateModalTitle}
              message={updateModalMessage}
              storeUrl={updateModalStoreUrl}
              onUpdatePress={onAppUpdateOpenStore}
              onLaterPress={updateModalMode === 'soft' ? onAppUpdateLater : undefined}
            />
            <ShareSavedAck visible={shareSavedAck} />
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AdaptiveChromeContext.Provider>
  );
}
