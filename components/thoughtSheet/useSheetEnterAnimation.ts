import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing } from 'react-native';

export type SheetEnterProfile = 'stream' | 'echo';

const STREAM_ENTER_SPRING = {
  damping: 30,
  stiffness: 170,
  mass: 1,
  useNativeDriver: true as const,
};

const ECHO_ENTER_MS = 380;

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
        inputRange: [0, 1],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      }),
    [enterProgress],
  );

  const contentOpacity = useMemo(
    () =>
      enterProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      }),
    [enterProgress],
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
