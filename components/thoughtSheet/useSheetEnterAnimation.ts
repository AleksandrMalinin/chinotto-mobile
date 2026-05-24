import { useEffect, useMemo, useRef } from 'react';
import { Animated } from 'react-native';

const ENTER_SPRING = {
  damping: 30,
  stiffness: 170,
  mass: 1,
  useNativeDriver: true as const,
};

/** Scrim + inner content enter — never apply to the sheet shell (see layout rule). */
export function useSheetEnterAnimation(visible: boolean, entryId: string | undefined) {
  const enterProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible || entryId == null) {
      return;
    }
    enterProgress.setValue(0);
    Animated.spring(enterProgress, {
      ...ENTER_SPRING,
      toValue: 1,
    }).start();
  }, [visible, entryId, enterProgress]);

  const scrimOpacity = useMemo(
    () =>
      enterProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      }),
    [enterProgress]
  );

  const contentOpacity = useMemo(
    () =>
      enterProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      }),
    [enterProgress]
  );

  const contentTranslateY = useMemo(
    () =>
      enterProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [18, 0],
        extrapolate: 'clamp',
      }),
    [enterProgress]
  );

  return { scrimOpacity, contentOpacity, contentTranslateY };
}
