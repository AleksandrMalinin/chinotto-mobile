import { useCallback, useMemo, useRef } from 'react';
import { Animated } from 'react-native';
import {
  State,
  type PanGestureHandlerGestureEvent,
  type PanGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';

import { shouldDismissThoughtSheet } from './detents';

const SPRING_BACK = {
  damping: 26,
  stiffness: 320,
  mass: 1,
  useNativeDriver: true as const,
};

/** Drag dismiss only tracks downward translation (swipe-up must not lift the sheet). */
export function sheetDragTranslationY(translationY: number): number {
  return Math.max(0, translationY);
}

type UseSheetDragDismissOptions = {
  /** Distance (px) to translate the sheet off-screen when dismissed. */
  travel: number;
  onDismiss: () => void;
  /** When false, downward drag is ignored (e.g. list scrolled). */
  canDrag?: () => boolean;
};

export function useSheetDragDismiss({ travel, onDismiss, canDrag }: UseSheetDragDismissOptions) {
  const dragY = useRef(new Animated.Value(0)).current;
  const dismissingRef = useRef(false);

  const setDragOffset = useCallback(
    (translationY: number) => {
      if (canDrag?.() === false && translationY > 0) {
        dragY.setValue(0);
        return;
      }
      dragY.setValue(sheetDragTranslationY(translationY));
    },
    [canDrag, dragY],
  );

  const springBack = useCallback(() => {
    Animated.spring(dragY, { ...SPRING_BACK, toValue: 0 }).start();
  }, [dragY]);

  const animateDismiss = useCallback(
    (fromY = 0, velocityY = 0) => {
      if (dismissingRef.current) {
        return;
      }
      dismissingRef.current = true;
      const remaining = Math.max(0, travel - fromY);
      const duration = Math.min(
        280,
        Math.max(160, remaining / Math.max(Math.abs(velocityY), 900) * 1000),
      );
      dragY.setValue(fromY);
      Animated.timing(dragY, {
        toValue: travel,
        duration,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          onDismiss();
        }
        dismissingRef.current = false;
      });
    },
    [dragY, onDismiss, travel],
  );

  // Plain handler (not Animated.event): we must clamp swipe-up to 0; native-driven
  // events require mapping inside nativeEvent and would apply negative translationY.
  const onGestureEvent = useCallback(
    (event: PanGestureHandlerGestureEvent) => {
      setDragOffset(event.nativeEvent.translationY);
    },
    [setDragOffset],
  );

  const onHandlerStateChange = useCallback(
    (event: PanGestureHandlerStateChangeEvent) => {
      const { oldState, state, translationY, velocityY } = event.nativeEvent;
      if (oldState === State.ACTIVE && (state === State.END || state === State.CANCELLED)) {
        if (canDrag?.() === false && translationY > 0) {
          springBack();
          return;
        }
        if (shouldDismissThoughtSheet(translationY, velocityY)) {
          animateDismiss(translationY, velocityY);
        } else {
          springBack();
        }
        return;
      }
      if (state === State.CANCELLED || state === State.FAILED) {
        springBack();
      }
    },
    [animateDismiss, canDrag, springBack],
  );

  const scrimDragMultiplier = useMemo(
    () =>
      dragY.interpolate({
        inputRange: [0, travel * 0.35, travel],
        outputRange: [1, 0.4, 0],
        extrapolate: 'clamp',
      }),
    [dragY, travel],
  );

  const resetDrag = useCallback(() => {
    dismissingRef.current = false;
    dragY.setValue(0);
  }, [dragY]);

  return {
    dragY,
    onGestureEvent,
    onHandlerStateChange,
    animateDismiss,
    springBack,
    resetDrag,
    scrimDragMultiplier,
  };
}
