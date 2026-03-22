import { useCallback, useEffect, useRef, useState } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BrandSplash } from './components/BrandSplash';
import { CaptureScreen } from './screens/CaptureScreen';
import { WelcomeOnboardingScreen } from './screens/WelcomeOnboardingScreen';
import { initDatabase } from './storage/db';
import { clearWelcomeFlag, hasCompletedWelcome } from './storage/welcomeFlag';

/** Keep native splash visible until we call hide (fonts + DB + short beat). */
void SplashScreen.preventAutoHideAsync();

/** Native splash visible briefly before JS brand layer (same bg as shell). */
const NATIVE_SPLASH_BEAT_MS = 400;

type AppPhase = 'boot' | 'brand' | 'welcome' | 'main';

export default function App() {
  const [fontsLoaded] = useFonts({
    'OpenSauceOne-400': require('./assets/fonts/OpenSauceOne-Regular.ttf'),
    'OpenSauceOne-500': require('./assets/fonts/OpenSauceOne-Medium.ttf'),
  });
  const [dbReady, setDbReady] = useState(false);
  const [phase, setPhase] = useState<AppPhase>('boot');
  /** Snapshot after `hasCompletedWelcome()` — drives brand → welcome vs main. */
  const welcomeDoneRef = useRef(true);

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
        void SplashScreen.hideAsync();
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
    <SafeAreaProvider>
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
        <CaptureScreen {...(__DEV__ ? { onDevMenu: onDevResetWelcome } : {})} />
      )}
    </SafeAreaProvider>
  );
}
