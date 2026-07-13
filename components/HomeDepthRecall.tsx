import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import type { PanGestureHandlerStateChangeEvent } from 'react-native-gesture-handler';

import { useAppTheme } from '../theme';
import type { EchoCandidate } from '../utils/selectEchoCandidates';
import { EchoRecallCardVessel } from './echo/EchoRecallCardVessel';
import { echoChromeFromTheme } from './echo/echoChrome';
import { shouldDismissGestureHintSwipe } from './GestureDiscoverHint';
import type { ThoughtSheetOpenAnchor } from './thoughtSheet/detents';

export type HomeDepthRecallProps = {
  candidate: EchoCandidate;
  recallDim?: Animated.Value;
  onEntryPress?: (entry: EchoCandidate, anchor?: ThoughtSheetOpenAnchor) => void;
  onDismiss?: (candidate: EchoCandidate) => void;
};

const DISMISS_EXIT_MS = 180;

/** Desktop-style memory echo — one slot under composer on stream home. */
export function HomeDepthRecall({
  candidate,
  recallDim,
  onEntryPress,
  onDismiss,
}: HomeDepthRecallProps) {
  const t = useAppTheme();
  const chrome = useMemo(() => echoChromeFromTheme(t), [t]);
  const dragX = useRef(new Animated.Value(0)).current;
  const dragOpacity = useRef(new Animated.Value(1)).current;
  const dismissDirectionRef = useRef<-1 | 1>(-1);

  useEffect(() => {
    dragX.setValue(0);
    dragOpacity.setValue(1);
  }, [candidate.id, dragOpacity, dragX]);

  const dismissWithAnimation = useCallback(
    (direction: -1 | 1 = dismissDirectionRef.current) => {
      if (!onDismiss) {
        return;
      }
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
          onDismiss(candidate);
        }
      });
    },
    [candidate, dragOpacity, dragX, onDismiss],
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
      if (!onDismiss) {
        return;
      }
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
    [dismissWithAnimation, dragOpacity, dragX, onDismiss],
  );

  const card = (
    <EchoRecallCardVessel
      candidate={candidate}
      chrome={chrome}
      onEntryPress={onEntryPress}
      onDismiss={onDismiss ? () => dismissWithAnimation(-1) : undefined}
      layout="depth"
    />
  );

  const interactiveCard = onDismiss ? (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
      activeOffsetX={[-12, 12]}
      failOffsetY={[-16, 16]}
    >
      <Animated.View
        style={{
          opacity: dragOpacity,
          transform: [{ translateX: dragX }],
        }}
        accessibilityHint="Swipe sideways to dismiss"
      >
        {card}
      </Animated.View>
    </PanGestureHandler>
  ) : (
    card
  );

  if (recallDim != null) {
    return (
      <Animated.View style={[styles.slot, { opacity: recallDim }]} testID="home-depth-recall">
        {interactiveCard}
      </Animated.View>
    );
  }

  return (
    <View style={styles.slot} testID="home-depth-recall">
      {interactiveCard}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    marginTop: 2,
    marginBottom: 10,
  },
});
