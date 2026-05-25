import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing } from 'react-native';

import { motion } from '../../constants/motion';

export type SheetEnterProfile = 'stream' | 'echo';

const STREAM_ENTER_SPRING = {
  ...motion.sheet.streamSpring,
  useNativeDriver: true as const,
};

const ECHO_ENTER_MS = motion.echo.sheetEnter;

/** Scrim + inner content enter — never apply to the sheet shell (see layout rule). */
export function useSheetEnterAnimation(
  visible: boolean,
  entryId: string | undefined,
  profile: SheetEnterProfile = 'stream',
) {
  const enterProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible || entryId == null) {
      return;
    }
    enterProgress.setValue(0);
    if (profile === 'echo') {
      Animated.timing(enterProgress, {
        toValue: 1,
        duration: ECHO_ENTER_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }
    Animated.spring(enterProgress, {
      ...STREAM_ENTER_SPRING,
      toValue: 1,
    }).start();
  }, [visible, entryId, enterProgress, profile]);

  const scrimOpacity = useMemo(
    () =>
      enterProgress.interpolate({
        inputRange: profile === 'echo' ? [0, 0.58, 1] : [0, 1],
        outputRange: profile === 'echo' ? [0, 0.92, 1] : [0, 1],
        extrapolate: 'clamp',
      }),
    [enterProgress, profile],
  );

  const contentOpacity = useMemo(
    () =>
      enterProgress.interpolate({
        inputRange: profile === 'echo' ? [0, 0.42, 1] : [0, 0.32, 1],
        outputRange: profile === 'echo' ? [0, 0, 1] : [0, 0, 1],
        extrapolate: 'clamp',
      }),
    [enterProgress, profile],
  );

  const contentTranslateY = useMemo(
    () =>
      enterProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [profile === 'echo' ? 12 : 18, 0],
        extrapolate: 'clamp',
      }),
    [enterProgress, profile],
  );

  return { scrimOpacity, contentOpacity, contentTranslateY };
}
