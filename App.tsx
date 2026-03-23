import { useCallback, useEffect, useRef, useState } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useIncomingShare } from 'expo-sharing';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandSplash } from './components/BrandSplash';
import { CaptureScreen } from './screens/CaptureScreen';
import { WelcomeOnboardingScreen } from './screens/WelcomeOnboardingScreen';
import {
  extractEntryTextsFromResolvedSharePayloads,
  extractEntryTextsFromSharePayloads,
} from './share/extractShareEntryTexts';
import { startMobileFirestoreIngest } from './sync/firestoreIngest';
import { resolvePushEntryForSync } from './sync/pushEntryForSync';
import { startBackgroundSync } from './sync/syncEngine';
import { initDatabase } from './storage/db';
import { saveEntry } from './storage/entryRepository';
import { clearWelcomeFlag, hasCompletedWelcome } from './storage/welcomeFlag';
/** Keep native splash visible until we call hide (fonts + DB + short beat). */
void SplashScreen.preventAutoHideAsync();

/**
 * Delay before mounting BrandSplash. Native splash stays up until BrandSplash’s first
 * `onLayout` calls `SplashScreen.hideAsync()` so the JS logo is already positioned underneath.
 */
const NATIVE_SPLASH_BEAT_MS = 400;

type AppPhase = 'boot' | 'brand' | 'welcome' | 'main';

function ShareSavedAck({ visible }: { visible: boolean }) {
  const insets = useSafeAreaInsets();
  if (!visible) {
    return null;
  }
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: insets.bottom + 16,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          backgroundColor: 'rgba(255,255,255,0.12)',
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 10,
        }}
      >
        <Text style={{ color: '#e8e8ec', fontSize: 15, fontFamily: 'OpenSauceOne-500' }}>Saved</Text>
      </View>
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    'OpenSauceOne-400': require('./assets/fonts/OpenSauceOne-Regular.ttf'),
    'OpenSauceOne-500': require('./assets/fonts/OpenSauceOne-Medium.ttf'),
  });
  const [dbReady, setDbReady] = useState(false);
  const [remoteIngestVersion, setRemoteIngestVersion] = useState(0);
  const [phase, setPhase] = useState<AppPhase>('boot');
  /** Snapshot after `hasCompletedWelcome()` — drives brand → welcome vs main. */
  const welcomeDoneRef = useRef(true);
  const [shareSavedAck, setShareSavedAck] = useState(false);
  const [externalEntriesEpoch, setExternalEntriesEpoch] = useState(0);
  const {
    resolvedSharedPayloads,
    sharedPayloads,
    isResolving,
    clearSharedPayloads,
  } = useIncomingShare();

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

  useEffect(() => {
    void initDatabase().finally(() => setDbReady(true));
  }, []);

  useEffect(() => {
    if (!dbReady || isResolving) {
      return;
    }
    let texts = extractEntryTextsFromResolvedSharePayloads(resolvedSharedPayloads);
    if (texts.length === 0) {
      texts = extractEntryTextsFromSharePayloads(sharedPayloads);
    }
    if (texts.length === 0) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        for (const t of texts) {
          if (cancelled) {
            return;
          }
          await saveEntry(t);
        }
        if (cancelled) {
          return;
        }
        clearSharedPayloads();
        setExternalEntriesEpoch((n) => n + 1);
        setShareSavedAck(true);
      } catch (err) {
        if (__DEV__) {
          console.warn('Incoming share save failed', err);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    dbReady,
    isResolving,
    resolvedSharedPayloads,
    sharedPayloads,
    clearSharedPayloads,
  ]);

  useEffect(() => {
    if (!shareSavedAck) {
      return;
    }
    const id = setTimeout(() => setShareSavedAck(false), 1600);
    return () => clearTimeout(id);
  }, [shareSavedAck]);

  useEffect(() => {
    if (!dbReady) {
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
  }, [dbReady]);

  useEffect(() => {
    if (!dbReady) {
      return;
    }
    const stopIngest = startMobileFirestoreIngest(() => {
      setRemoteIngestVersion((v) => v + 1);
    });
    return stopIngest;
  }, [dbReady]);

  useEffect(() => {
    if (!fontsLoaded || !dbReady) {
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
              {...(__DEV__ ? { onDevMenu: onDevResetWelcome } : {})}
            />
          )}
          <ShareSavedAck visible={shareSavedAck} />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
