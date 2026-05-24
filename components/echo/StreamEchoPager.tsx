import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from 'react';
import {
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PixelRatio,
  StyleSheet,
  View,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import type { ScrollView as ScrollViewType } from 'react-native-gesture-handler';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export type StreamEchoPagerHandle = {
  scrollToStream: (animated?: boolean) => void;
  /** Briefly reveal Echo from stream home — used for one-time edge peek. */
  peekEchoEdge: (peekPx: number, animated?: boolean) => void;
};

export type StreamEchoPagerProps = {
  pageWidth: number;
  /** When false, renders stream children only (no horizontal chrome). */
  echoMounted: boolean;
  /** When false, horizontal scroll is locked (search, sheet, etc.). */
  pagerInteractive: boolean;
  /** Opaque echo page base — blocks stream ambient from bleeding at edges. */
  echoPageBackground?: string;
  /** Drives shell-level ambient crossfade (0 = Echo, pageWidth = stream home). */
  scrollX?: Animated.Value;
  /** 0 = stream (home), 1 = echo. */
  onPageIndexChange?: (index: 0 | 1) => void;
  echo: ReactNode;
  children: ReactNode;
};

/** Stream sits on the trailing page; echo is revealed by swiping **right** (avoids delete = swipe left). */
export function streamEchoPagerHomeOffset(pageWidth: number): number {
  return Math.max(0, pageWidth);
}

export function streamEchoPagerRevealProgress(contentOffsetX: number, pageWidth: number): number {
  if (pageWidth <= 0) {
    return 0;
  }
  const progress = 1 - contentOffsetX / pageWidth;
  return Math.min(1, Math.max(0, progress));
}

export function streamEchoPagerIndexFromOffset(contentOffsetX: number, pageWidth: number): 0 | 1 {
  if (pageWidth <= 0) {
    return 0;
  }
  return contentOffsetX < pageWidth * 0.5 ? 1 : 0;
}

export const StreamEchoPager = forwardRef<StreamEchoPagerHandle, StreamEchoPagerProps>(
  function StreamEchoPager(
    {
      pageWidth,
      echoMounted,
      pagerInteractive,
      echoPageBackground,
      scrollX,
      onPageIndexChange,
      echo,
      children,
    },
    ref,
  ) {
    const pagerRef = useRef<ScrollViewType>(null);

    const scrollToStream = useCallback(
      (animated = true) => {
        pagerRef.current?.scrollTo({
          x: streamEchoPagerHomeOffset(PixelRatio.roundToNearestPixel(pageWidth)),
          y: 0,
          animated,
        });
      },
      [pageWidth],
    );

    const peekEchoEdge = useCallback(
      (peekPx: number, animated = true) => {
        if (peekPx <= 0 || pageWidth <= 0) {
          return;
        }
        const pageSpan = PixelRatio.roundToNearestPixel(pageWidth);
        const homeX = streamEchoPagerHomeOffset(pageSpan);
        pagerRef.current?.scrollTo({
          x: Math.max(0, homeX - peekPx),
          y: 0,
          animated,
        });
      },
      [pageWidth],
    );

    useImperativeHandle(ref, () => ({ scrollToStream, peekEchoEdge }), [peekEchoEdge, scrollToStream]);

    useLayoutEffect(() => {
      if (!echoMounted || pageWidth <= 0) {
        return;
      }
      pagerRef.current?.scrollTo({
        x: streamEchoPagerHomeOffset(PixelRatio.roundToNearestPixel(pageWidth)),
        y: 0,
        animated: false,
      });
    }, [echoMounted, pageWidth]);

    const onScrollEnd = useCallback(
      (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (!echoMounted) {
          return;
        }
        const index = streamEchoPagerIndexFromOffset(e.nativeEvent.contentOffset.x, pageWidth);
        onPageIndexChange?.(index);
      },
      [echoMounted, onPageIndexChange, pageWidth],
    );

    if (!echoMounted) {
      return <View style={styles.flex}>{children}</View>;
    }

    const pageSpan = PixelRatio.roundToNearestPixel(pageWidth);
    const homeX = streamEchoPagerHomeOffset(pageSpan);
    const onScroll =
      scrollX != null
        ? Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
            useNativeDriver: true,
          })
        : undefined;
    const PagerScrollView = scrollX != null ? AnimatedScrollView : ScrollView;

    return (
      <PagerScrollView
        key="stream-echo-pager-mounted"
        testID="stream-echo-pager"
        ref={pagerRef}
        horizontal
        pagingEnabled
        scrollEnabled={pagerInteractive}
        showsHorizontalScrollIndicator={false}
        bounces={pagerInteractive}
        directionalLockEnabled
        nestedScrollEnabled
        scrollEventThrottle={16}
        contentOffset={{ x: homeX, y: 0 }}
        onScroll={onScroll}
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
        style={[styles.flex, styles.clip, styles.transparent]}
        contentContainerStyle={{
          width: pageSpan * 2,
          flexGrow: 1,
          backgroundColor: 'transparent',
        }}
      >
        <View
          style={[
            styles.page,
            { width: pageSpan, backgroundColor: echoPageBackground ?? 'transparent' },
          ]}
          testID="stream-echo-page"
        >
          {echo}
        </View>
        <View
          style={[styles.page, { width: pageSpan, backgroundColor: 'transparent' }]}
          testID="stream-home-page"
        >
          {children}
        </View>
      </PagerScrollView>
    );
  },
);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  transparent: { backgroundColor: 'transparent' },
  clip: { overflow: 'hidden' },
  page: { flex: 1, overflow: 'hidden' },
});
