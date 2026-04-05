import { useCallback, useEffect, useRef, useState } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useIncomingShare } from 'expo-sharing';
import { AccessibilityInfo, Platform, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandSplash } from './components/BrandSplash';
import { STREAM_HIGHLIGHT_CLEAR_AFTER_MS } from './components/RecentList';
import { CaptureScreen } from './screens/CaptureScreen';
import { WelcomeOnboardingScreen } from './screens/WelcomeOnboardingScreen';
import { loadSubscriptionState } from './monetization/subscriptionState';
import { bootstrapRevenueCat } from './src/services/purchases/initRevenueCat';
import { composeIncomingShareCaptureText } from './share/extractShareEntryTexts';
import { startMobileFirestoreIngest } from './sync/firestoreIngest';
import { resolvePushEntryForSync } from './sync/pushEntryForSync';
import { startBackgroundSync } from './sync/syncEngine';
import { useScreenshotSceneLink } from './linking/useScreenshotSceneLink';
import { useSyncDeepLink } from './linking/useSyncDeepLink';
import { isScreenshotMode } from './src/features/screenshotMode';
import { initDatabase } from './storage/db';
import { saveEntry } from './storage/entryRepository';
import { clearWelcomeFlag, hasCompletedWelcome } from './storage/welcomeFlag';
import { isFirebaseSyncConfigured } from './sync/firebaseConfig';
import { useCaptureWidgetDeepLinkFocus } from './widgets/useCaptureWidgetDeepLinkFocus';
import { useExperimentalIosHomeWidgetRegistration } from './widgets/useExperimentalIosHomeWidget';
import { colorsDark } from './theme';

/** Keep native splash visible until we call hide (fonts + DB + short beat). */
void SplashScreen.preventAutoHideAsync();

/**
 * Delay before mounting BrandSplash. Native splash stays up until BrandSplash’s first
 * `onLayout` calls `SplashScreen.hideAsync()` so the JS logo is already positioned underneath.
 */
const NATIVE_SPLASH_BEAT_MS = 400;
/** Wait for expo-sharing to finish resolving multi-part payloads before one save. */
const SHARE_SAVE_DEBOUNCE_MS = 400;

type AppPhase = 'boot' | 'brand' | 'welcome' | 'main';

function ShareSavedAck({ visible }: { visible: boolean }) {
  const insets = useSafeAreaInsets();
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
      <View style={shareAckStyles.pill}>
        <Text style={shareAckStyles.label}>Saved from share</Text>
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
    /** Near-opaque elevated surface; +blue vs neutral charcoal for a whisper of brand. */
    backgroundColor: 'rgba(23, 24, 36, 0.99)',
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    maxWidth: '88%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 12,
      },
      android: {
        elevation: 5,
      },
      default: {},
    }),
  },
  label: {
    color: colorsDark.fg,
    fontSize: 15,
    fontFamily: 'OpenSauceOne-500',
    textAlign: 'center',
    letterSpacing: 0.15,
  },
});

export default function App() {
  const [fontsLoaded] = useFonts({
    'OpenSauceOne-400': require('./assets/fonts/OpenSauceOne-Regular.ttf'),
    'OpenSauceOne-500': require('./assets/fonts/OpenSauceOne-Medium.ttf'),
  });
  const [dbReady, setDbReady] = useState(false);
  const [subscriptionLoaded, setSubscriptionLoaded] = useState(false);
  const [firestoreIngestEpoch, setFirestoreIngestEpoch] = useState(0);
  const [remoteIngestVersion, setRemoteIngestVersion] = useState(0);
  const [phase, setPhase] = useState<AppPhase>('boot');
  /** Snapshot after `hasCompletedWelcome()` — drives brand → welcome vs main. */
  const welcomeDoneRef = useRef(true);
  /** Bumps each time we start handling a non-empty share — avoids stale async after re-renders. */
  const shareSaveSessionRef = useRef(0);
  const [shareSavedAck, setShareSavedAck] = useState(false);
  const [externalEntriesEpoch, setExternalEntriesEpoch] = useState(0);
  const [captureFocusNonce, setCaptureFocusNonce] = useState(0);
  const [streamHighlightEntryId, setStreamHighlightEntryId] = useState<string | null>(null);
  const streamHighlightClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [syncEntryRequestNonce, setSyncEntryRequestNonce] = useState(0);
  const {
    resolvedSharedPayloads,
    sharedPayloads,
    isResolving,
    clearSharedPayloads,
    refreshSharePayloads,
  } = useIncomingShare();

  const screenshotScene = useScreenshotSceneLink();

  const onBrandFinished = useCallback(() => {
    setPhase(welcomeDoneRef.current ? 'main' : 'welcome');
  }, []);

  const onWelcomeComplete = useCallback(() => {
    welcomeDoneRef.current = true;
    setPhase('main');
  }, []);

  const onDevResetWelcome = useCallback(() => {
    void (async () => {
      await clearWelcomeFlag();
      welcomeDoneRef.current = false;
      setPhase('brand');
    })();
  }, []);

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
    void (async () => {
      await bootstrapRevenueCat();
      await loadSubscriptionState();
      setSubscriptionLoaded(true);
    })();
  }, []);

  useExperimentalIosHomeWidgetRegistration(dbReady);

  useCaptureWidgetDeepLinkFocus(
    useCallback(() => {
      setCaptureFocusNonce((n) => n + 1);
    }, [])
  );

  const bumpSyncEntryFromDeepLink = useCallback((_url: string) => {
    setSyncEntryRequestNonce((n) => n + 1);
  }, []);

  useSyncDeepLink({
    enabled: Platform.OS === 'ios' && isFirebaseSyncConfigured(),
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
        setShareSavedAck(true);
        AccessibilityInfo.announceForAccessibility?.('Thought saved from share');
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
    if (!dbReady || !subscriptionLoaded) {
      return;
    }
    const stopIngest = startMobileFirestoreIngest(() => {
      setRemoteIngestVersion((v) => v + 1);
    });
    return stopIngest;
  }, [dbReady, subscriptionLoaded, firestoreIngestEpoch]);

  useEffect(() => {
    if (!fontsLoaded || !dbReady) {
      return;
    }
    if (isScreenshotMode()) {
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    void (async () => {
      const seen = await hasCompletedWelcome();
      if (cancelled) {
        return;
      }
      welcomeDoneRef.current = seen;
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

  useEffect(() => {
    if (!fontsLoaded || !dbReady || !isScreenshotMode()) {
      return;
    }
    if (screenshotScene === 'welcome') {
      welcomeDoneRef.current = false;
      setPhase('welcome');
    } else {
      welcomeDoneRef.current = true;
      setPhase('main');
    }
  }, [fontsLoaded, dbReady, screenshotScene]);

  /**
   * Screenshot mode skips {@link BrandSplash}, which normally calls `SplashScreen.hideAsync()`.
   * Without this, the native splash never dismisses.
   */
  useEffect(() => {
    if (!isScreenshotMode() || !fontsLoaded || !dbReady) {
      return;
    }
    if (phase === 'main' || phase === 'welcome') {
      void SplashScreen.hideAsync();
    }
  }, [phase, fontsLoaded, dbReady]);

  if (!fontsLoaded || !dbReady || phase === 'boot') {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <View style={{ flex: 1 }}>
          <StatusBar style="light" />
          {phase === 'welcome' ? (
            <View style={{ flex: 1, backgroundColor: '#0a0a0e' }}>
              <WelcomeOnboardingScreen onComplete={onWelcomeComplete} />
            </View>
          ) : phase === 'brand' ? (
            <View style={{ flex: 1, backgroundColor: '#0a0a0e' }}>
              <BrandSplash onFinished={onBrandFinished} />
            </View>
          ) : (
            <CaptureScreen
              remoteIngestVersion={remoteIngestVersion}
              externalEntriesEpoch={externalEntriesEpoch}
              captureFocusNonce={captureFocusNonce}
              syncEntryRequestNonce={syncEntryRequestNonce}
              streamHighlightEntryId={streamHighlightEntryId}
              onScheduleStreamHighlight={scheduleStreamHighlight}
              subscriptionHydrated={subscriptionLoaded}
              onSubscriptionUnlocked={() => setFirestoreIngestEpoch((n) => n + 1)}
              screenshot={isScreenshotMode() ? { scene: screenshotScene } : undefined}
              {...(__DEV__ ? { onDevMenu: onDevResetWelcome } : {})}
            />
          )}
          <ShareSavedAck visible={shareSavedAck} />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
