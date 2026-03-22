import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  type LayoutChangeEvent,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

import { SPLASH_LOGO_SIZE_PTS, SPLASH_LOGO_STROKE_PTS } from '../constants/splashLogo';
import { AmbientBackground } from './AmbientBackground';
import { ChinottoLogo } from './ChinottoLogo';
import { IntroBlobField } from './IntroBlobField';

/** After logo stroke + dots; a beat of breathe begins at 3.2s — hold through that. */
const HOLD_MS = 3600;
const HOLD_REDUCE_MOTION_MS = 650;
const FADE_OUT_MS = 450;

type Props = {
  onFinished: () => void;
};

/**
 * Desktop intro–adjacent beat: same shell background class as main app + intro blobs +
 * `ChinottoLogo` with web-matched stroke / dot / breathe timings, then fades away.
 *
 * Logo is centered in the same coordinate space as the root view (matches iOS Launch Screen
 * center to superview). Native splash is hidden only after this view’s first layout so the
 * bitmap is not removed before the JS layer has measured and drawn.
 */
export function BrandSplash({ onFinished }: Props) {
  const opacity = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  const { width: windowW, height: windowH } = useWindowDimensions();
  const [rootLayout, setRootLayout] = useState({ w: 0, h: 0 });
  const didHideNativeSplash = useRef(false);

  const contentW = rootLayout.w > 0 ? rootLayout.w : windowW;
  const contentH = rootLayout.h > 0 ? rootLayout.h : windowH;

  const logoFrame = useMemo(() => {
    const s = SPLASH_LOGO_SIZE_PTS;
    return {
      position: 'absolute' as const,
      left: (contentW - s) / 2,
      top: (contentH - s) / 2,
      width: s,
      height: s,
    };
  }, [contentW, contentH]);

  const onRootLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      setRootLayout({ w: width, h: height });
      if (width <= 0 || height <= 0 || didHideNativeSplash.current) {
        return;
      }
      didHideNativeSplash.current = true;
      requestAnimationFrame(() => {
        void SplashScreen.hideAsync();
      });
    },
    []
  );

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    const hold = reduceMotion ? HOLD_REDUCE_MOTION_MS : HOLD_MS;
    const id = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_OUT_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          onFinished();
        }
      });
    }, hold);
    return () => clearTimeout(id);
  }, [reduceMotion, onFinished, opacity]);

  return (
    <Animated.View
      style={[styles.root, { opacity }]}
      pointerEvents="none"
      onLayout={onRootLayout}
    >
      <AmbientBackground />
      <IntroBlobField />
      <View style={logoFrame} pointerEvents="none">
        <ChinottoLogo
          testID="brand-splash-logo"
          size={SPLASH_LOGO_SIZE_PTS}
          strokeWidth={SPLASH_LOGO_STROKE_PTS}
          color="rgba(255, 255, 255, 0.92)"
          animated={!reduceMotion}
          reduceMotion={reduceMotion}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
});
