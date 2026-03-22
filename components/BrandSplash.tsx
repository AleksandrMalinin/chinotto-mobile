import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';

import { AmbientBackground } from './AmbientBackground';
import { ChinottoLogo } from './ChinottoLogo';
import { IntroBlobField } from './IntroBlobField';

/** After logo stroke + dots; a beat of breathe begins at 3.2s — hold through that. */
const HOLD_MS = 3600;
const HOLD_REDUCE_MOTION_MS = 650;
const FADE_OUT_MS = 450;

const LOGO_SIZE = 120;

type Props = {
  onFinished: () => void;
};

/**
 * Desktop intro–adjacent beat: same shell background class as main app + intro blobs +
 * `ChinottoLogo` with web-matched stroke / dot / breathe timings, then fades away.
 */
export function BrandSplash({ onFinished }: Props) {
  const opacity = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

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
    <Animated.View style={[styles.root, { opacity }]} pointerEvents="none">
      <AmbientBackground />
      <IntroBlobField />
      <View style={styles.center} pointerEvents="none">
        <ChinottoLogo
          testID="brand-splash-logo"
          size={LOGO_SIZE}
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
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
