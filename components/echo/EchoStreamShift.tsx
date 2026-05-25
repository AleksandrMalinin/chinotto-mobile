import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { Animated, Easing, PanResponder, StyleSheet, View } from 'react-native';

import {
  ECHO_PAGER_REVEAL_IN_MS,
  ECHO_PAGER_REVEAL_OUT_MS,
} from '../../constants/echoLayer';
import {
  streamEchoPagerHomeOffset,
  streamEchoPagerIndexFromOffset,
} from './StreamEchoPager';

export type EchoRevealHandle = {
  scrollToStream: (animated?: boolean) => void;
  peekEchoEdge: (peekPx: number, animated?: boolean) => void;
};

export type EchoStreamShiftProps = {
  pageWidth: number;
  scrollX: Animated.Value;
  echoMounted: boolean;
  interactive: boolean;
  echo: ReactNode;
  onPageIndexChange?: (index: 0 | 1) => void;
  children: ReactNode;
};

function readScrollX(scrollX: Animated.Value, fallback: number): number {
  const value = (scrollX as Animated.Value & { __getValue?: () => number }).__getValue?.();
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function settleOffsetX(
  x: number,
  homeX: number,
  vx: number,
): number {
  if (vx > 0.35) {
    return 0;
  }
  if (vx < -0.35) {
    return homeX;
  }
  return x < homeX * 0.5 ? 0 : homeX;
}

/**
 * Echo under stream; horizontal pan shifts stream aside (both directions).
 * scrollX stays on the native animated driver (opacity/transform interpolations).
 */
export const EchoStreamShift = forwardRef<EchoRevealHandle, EchoStreamShiftProps>(
  function EchoStreamShift(
    { pageWidth, scrollX, echoMounted, interactive, echo, onPageIndexChange, children },
    ref,
  ) {
    const homeX = streamEchoPagerHomeOffset(pageWidth);
    const dragOriginX = useRef(homeX);

    const streamTranslateX = useMemo(
      () =>
        scrollX.interpolate({
          inputRange: [0, pageWidth],
          outputRange: [pageWidth, 0],
          extrapolate: 'clamp',
        }),
      [pageWidth, scrollX],
    );

    const scrollToOffset = useCallback(
      (x: number, animated: boolean) => {
        const target = Math.max(0, Math.min(homeX, x));
        if (animated) {
          const duration = target < homeX * 0.5 ? ECHO_PAGER_REVEAL_IN_MS : ECHO_PAGER_REVEAL_OUT_MS;
          Animated.timing(scrollX, {
            toValue: target,
            duration,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start(({ finished }) => {
            if (finished) {
              onPageIndexChange?.(streamEchoPagerIndexFromOffset(target, pageWidth));
            }
          });
          return;
        }
        scrollX.setValue(target);
        onPageIndexChange?.(streamEchoPagerIndexFromOffset(target, pageWidth));
      },
      [homeX, onPageIndexChange, pageWidth, scrollX],
    );

    const scrollToStream = useCallback(
      (animated = true) => {
        scrollToOffset(homeX, animated);
      },
      [homeX, scrollToOffset],
    );

    const peekEchoEdge = useCallback(
      (peekPx: number, animated = true) => {
        if (peekPx <= 0 || pageWidth <= 0) {
          return;
        }
        scrollToOffset(Math.max(0, homeX - peekPx), animated);
      },
      [homeX, pageWidth, scrollToOffset],
    );

    useImperativeHandle(ref, () => ({ scrollToStream, peekEchoEdge }), [peekEchoEdge, scrollToStream]);

    useLayoutEffect(() => {
      if (!echoMounted || pageWidth <= 0) {
        return;
      }
      scrollX.setValue(homeX);
    }, [echoMounted, homeX, pageWidth, scrollX]);

    const panResponder = useMemo(() => {
      if (!interactive || pageWidth <= 0) {
        return null;
      }

      const isHorizontalReveal = (gesture: { dx: number; dy: number }) =>
        Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) + 4;

      return PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gesture) => isHorizontalReveal(gesture),
        onMoveShouldSetPanResponder: (_, gesture) => isHorizontalReveal(gesture),
        onPanResponderGrant: () => {
          dragOriginX.current = readScrollX(scrollX, homeX);
        },
        onPanResponderMove: (_, gesture) => {
          const x = Math.max(0, Math.min(homeX, dragOriginX.current - gesture.dx));
          scrollX.setValue(x);
        },
        onPanResponderRelease: (_, gesture) => {
          const x = Math.max(0, Math.min(homeX, dragOriginX.current - gesture.dx));
          scrollToOffset(settleOffsetX(x, homeX, gesture.vx), true);
        },
      });
    }, [homeX, interactive, pageWidth, scrollToOffset, scrollX]);

    if (!echoMounted) {
      return <View style={styles.flex}>{children}</View>;
    }

    const revealPanHandlers = panResponder?.panHandlers ?? {};

    return (
      <View style={styles.flex} testID="echo-stream-shift" collapsable={false}>
        <View
          style={[styles.echoUnderlay, { width: pageWidth }]}
          pointerEvents="box-none"
          {...revealPanHandlers}
        >
          {echo}
        </View>
        <Animated.View
          style={[styles.flex, { transform: [{ translateX: streamTranslateX }] }]}
          {...revealPanHandlers}
        >
          {children}
        </Animated.View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  echoUnderlay: {
    ...StyleSheet.absoluteFillObject,
    right: undefined,
  },
});
