import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import type { PanGestureHandlerStateChangeEvent } from 'react-native-gesture-handler';

import { fonts, useAppTheme } from '../theme';

export type GestureDiscoverHintProps = {
  testID: string;
  message: string;
  visible: boolean;
  onDismiss: () => void;
};

const FADE_MS = 280;
const DISMISS_DRAG_X = 48;
const DISMISS_VELOCITY_X = 0.45;
const DISMISS_EXIT_MS = 180;

/** Sideways drag or flick — dismiss like a notification banner. */
export function shouldDismissGestureHintSwipe(translationX: number, velocityX: number): boolean {
  return (
    Math.abs(translationX) > DISMISS_DRAG_X || Math.abs(velocityX) > DISMISS_VELOCITY_X
  );
}

/** One-time spatial discoverability — Chinotto pill; swipe sideways or tap × to dismiss. */
export function GestureDiscoverHint({ testID, message, visible, onDismiss }: GestureDiscoverHintProps) {
  const t = useAppTheme();
  const { colors, radius } = t;
  const enterOpacity = useRef(new Animated.Value(0)).current;
  const dragX = useRef(new Animated.Value(0)).current;
  const dragOpacity = useRef(new Animated.Value(1)).current;
  const dismissDirectionRef = useRef<-1 | 1>(-1);

  useEffect(() => {
    if (!visible) {
      enterOpacity.setValue(0);
      dragX.setValue(0);
      dragOpacity.setValue(1);
      return;
    }
    const anim = Animated.timing(enterOpacity, {
      toValue: 1,
      duration: FADE_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [dragOpacity, dragX, enterOpacity, visible]);

  const shellOpacity = useMemo(
    () => Animated.multiply(enterOpacity, dragOpacity),
    [dragOpacity, enterOpacity],
  );

  const dismissWithAnimation = useCallback(
    (direction: -1 | 1 = dismissDirectionRef.current) => {
      Animated.parallel([
        Animated.timing(dragX, {
          toValue: direction * 120,
          duration: DISMISS_EXIT_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(dragOpacity, {
          toValue: 0,
          duration: DISMISS_EXIT_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          onDismiss();
        }
      });
    },
    [dragOpacity, dragX, onDismiss],
  );

  const onGestureEvent = useMemo(
    () =>
      Animated.event([{ nativeEvent: { translationX: dragX } }], {
        useNativeDriver: true,
      }),
    [dragX],
  );

  const onHandlerStateChange = useCallback(
    (event: PanGestureHandlerStateChangeEvent) => {
      const { state, translationX, velocityX } = event.nativeEvent;
      if (state === State.ACTIVE) {
        const fade = Math.max(0.35, 1 - Math.abs(translationX) / 120);
        dragOpacity.setValue(fade);
        return;
      }
      if (state !== State.END && state !== State.CANCELLED && state !== State.FAILED) {
        return;
      }
      if (shouldDismissGestureHintSwipe(translationX, velocityX)) {
        dismissDirectionRef.current = translationX >= 0 ? 1 : -1;
        dismissWithAnimation(dismissDirectionRef.current);
        return;
      }
      Animated.parallel([
        Animated.spring(dragX, {
          toValue: 0,
          useNativeDriver: true,
          speed: 20,
          bounciness: 0,
        }),
        Animated.timing(dragOpacity, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [dismissWithAnimation, dragOpacity, dragX],
  );

  if (!visible) {
    return null;
  }

  return (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
      activeOffsetX={[-12, 12]}
      failOffsetY={[-16, 16]}
    >
      <Animated.View
        style={{
          opacity: shellOpacity,
          transform: [{ translateX: dragX }],
        }}
        testID={testID}
        accessibilityRole="text"
        accessibilityHint="Swipe sideways to dismiss"
      >
        <View
          style={[
            styles.pill,
            {
              backgroundColor: colors.accentSubtle,
              borderColor: colors.border,
              borderRadius: radius.md,
            },
          ]}
        >
          <Text style={[styles.copy, { color: colors.muted, flex: 1 }]}>{message}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss hint"
            onPress={() => dismissWithAnimation(-1)}
            hitSlop={8}
            style={({ pressed }) => [{ opacity: pressed ? 0.55 : 0.85 }]}
          >
            <Text style={[styles.dismiss, { color: colors.muted }]}>×</Text>
          </Pressable>
        </View>
      </Animated.View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    marginBottom: 2,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  copy: {
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.18,
    opacity: 0.88,
  },
  dismiss: {
    fontFamily: fonts.regular,
    fontSize: 17,
    lineHeight: 19,
    opacity: 0.65,
  },
});
