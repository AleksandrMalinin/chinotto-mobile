import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { GUIDE_SLIDES } from './interfaceGuide/guideSlides';
import { motion } from '../constants/motion';
import {
  fonts,
  radius,
  spacing,
  typography,
  useAppTheme,
} from '../theme';

type Props = {
  visible: boolean;
  onDismiss: () => void;
};

function GuideBackdrop({
  onPress,
  opacity,
  sunlightMode,
  blurTint,
  blurIntensity,
}: {
  onPress: () => void;
  opacity: Animated.Value;
  sunlightMode: boolean;
  blurTint: 'dark' | 'light' | 'systemUltraThinMaterialDark' | 'systemUltraThinMaterialLight';
  blurIntensity: number;
}) {
  /** Light veil on top of native blur — keeps capture readable without a muddy scrim. */
  const veilColor = sunlightMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.08)';

  return (
    <>
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity }]}
        pointerEvents="none"
        testID="interface-guide-backdrop"
      >
        {Platform.OS === 'ios' || Platform.OS === 'android' ? (
          <BlurView
            intensity={blurIntensity}
            tint={blurTint}
            style={StyleSheet.absoluteFill}
            {...(Platform.OS === 'android'
              ? { blurMethod: 'dimezisBlurViewSdk31Plus' as const }
              : {})}
          />
        ) : null}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: veilColor }]} />
      </Animated.View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss guide"
        style={StyleSheet.absoluteFill}
        onPress={onPress}
      />
    </>
  );
}

function GuideSlideEnter({
  active,
  delay = 0,
  children,
}: {
  active: boolean;
  delay?: number;
  children: React.ReactNode;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  const scale = useRef(new Animated.Value(0.985)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (!active) {
      return;
    }
    if (reduceMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      scale.setValue(1);
      return;
    }
    opacity.setValue(0);
    translateY.setValue(10);
    scale.setValue(0.985);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: motion.echo.pagerRevealIn,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 340,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 360,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [active, delay, opacity, reduceMotion, scale, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>{children}</Animated.View>
  );
}

function GuidePagerDot({
  active,
  color,
  testID,
}: {
  active: boolean;
  color: string;
  testID?: string;
}) {
  const width = useRef(new Animated.Value(active ? 18 : 6)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    const target = active ? 18 : 6;
    if (reduceMotion) {
      width.setValue(target);
      return;
    }
    Animated.timing(width, {
      toValue: target,
      duration: motion.capture.relaxed,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [active, reduceMotion, width]);

  return (
    <Animated.View
      testID={testID}
      style={[
        styles.dot,
        {
          width,
          backgroundColor: color,
          opacity: active ? 0.95 : 0.45,
          shadowColor: active ? 'rgba(120, 140, 220, 0.9)' : 'transparent',
          shadowOpacity: active ? 0.42 : 0,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 0 },
        },
      ]}
    />
  );
}

function GuideSlideTitle({ text, testID }: { text: string; testID?: string }) {
  const t = useAppTheme();

  return (
    <Text
      testID={testID}
      style={[
        styles.slideTitle,
        {
          color: t.colors.fg,
          fontFamily: fonts.medium,
        },
      ]}
    >
      {text}
    </Text>
  );
}

/** Slide-based interface guide — glass card over blurred capture. */
export function InterfaceGuideModal({ visible, onDismiss }: Props) {
  const t = useAppTheme();
  const { sunlightMode } = t;
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const sheetWidth = Math.min(560, Math.max(320, windowWidth - spacing.md * 2));
  /** Must match ScrollView viewport width so paging snaps one centered slide at a time. */
  const pagerWidth = sheetWidth;
  const sheetOpacity = useRef(new Animated.Value(0)).current;
  const sheetScale = useRef(new Animated.Value(0.96)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const isLastSlide = activeIndex >= GUIDE_SLIDES.length - 1;
  const backdropBlurTint = sunlightMode ? 'systemUltraThinMaterialLight' : 'systemUltraThinMaterialDark';
  const sheetFill = sunlightMode ? 'rgba(252, 252, 254, 0.9)' : 'rgba(16, 16, 24, 0.84)';
  const borderGradient = sunlightMode
    ? (['rgba(170, 188, 255, 0.34)', 'rgba(102, 118, 198, 0.12)', 'rgba(170, 188, 255, 0.2)'] as const)
    : (['rgba(160, 170, 220, 0.22)', 'rgba(88, 104, 168, 0.1)', 'rgba(34, 200, 220, 0.08)'] as const);

  useEffect(() => {
    if (!visible) {
      sheetOpacity.setValue(0);
      sheetScale.setValue(0.96);
      backdropOpacity.setValue(0);
      setActiveIndex(0);
      scrollRef.current?.scrollTo({ x: 0, animated: false });
      return;
    }

    const anim = Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 340,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(sheetOpacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(sheetScale, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [backdropOpacity, sheetOpacity, sheetScale, visible]);

  const finish = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  const goToSlide = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, GUIDE_SLIDES.length - 1));
      scrollRef.current?.scrollTo({ x: clamped * pagerWidth, animated: true });
      setActiveIndex(clamped);
    },
    [pagerWidth],
  );

  const onPrimaryPress = useCallback(() => {
    if (isLastSlide) {
      finish();
      return;
    }
    goToSlide(activeIndex + 1);
  }, [activeIndex, finish, goToSlide, isLastSlide]);

  const onScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(event.nativeEvent.contentOffset.x / pagerWidth);
      setActiveIndex(Math.max(0, Math.min(next, GUIDE_SLIDES.length - 1)));
    },
    [pagerWidth],
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : 'fullScreen'}
      statusBarTranslucent
      onRequestClose={finish}
    >
      <View style={styles.modalRoot} testID="interface-guide-modal">
        <GuideBackdrop
          onPress={finish}
          opacity={backdropOpacity}
          sunlightMode={sunlightMode}
          blurTint={backdropBlurTint}
          blurIntensity={Platform.OS === 'ios' ? 50 : 34}
        />

        <Animated.View
          style={[
            styles.sheetOuter,
            {
              opacity: sheetOpacity,
              transform: [{ scale: sheetScale }],
              width: sheetWidth,
              maxHeight: windowHeight * 0.88,
            },
            sunlightMode ? null : styles.sheetOuterShadow,
          ]}
        >
          {sunlightMode ? null : (
            <>
              <View pointerEvents="none" style={styles.sheetAuraViolet} />
              <View pointerEvents="none" style={styles.sheetAuraCyan} />
            </>
          )}

          <LinearGradient
            colors={[...borderGradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.sheetBorderRing, { borderRadius: radius.lg }]}
          >
            <View style={[styles.sheet, { borderRadius: radius.lg - 1 }]}>
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                {Platform.OS === 'ios' || Platform.OS === 'android' ? (
                  <BlurView
                    intensity={Platform.OS === 'ios' ? 28 : 22}
                    tint={backdropBlurTint}
                    style={StyleSheet.absoluteFill}
                    {...(Platform.OS === 'android'
                      ? { blurMethod: 'dimezisBlurViewSdk31Plus' as const }
                      : {})}
                  />
                ) : null}
                <View style={[StyleSheet.absoluteFill, { backgroundColor: sheetFill }]} />
                {!sunlightMode ? (
                  <LinearGradient
                    colors={[
                      'rgba(100, 118, 185, 0.12)',
                      'rgba(100, 118, 185, 0.03)',
                      'rgba(34, 200, 220, 0.035)',
                      'rgba(34, 200, 220, 0.09)',
                    ]}
                    locations={[0, 0.4, 0.62, 1]}
                    start={{ x: 0.08, y: 0 }}
                    end={{ x: 0.92, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                ) : null}
                <View
                  pointerEvents="none"
                  style={[
                    styles.sheetInnerRing,
                    sunlightMode ? { borderColor: 'rgba(255,255,255,0.22)' } : null,
                  ]}
                />
              </View>

              <View style={styles.sheetContent}>
                <View style={styles.headerRow}>
                  <Text
                    testID="interface-guide-kicker"
                    style={[
                      styles.kicker,
                      {
                        color: t.colors.metaFg,
                        fontFamily: typography.meta.fontFamily,
                      },
                    ]}
                  >
                    Interface guide
                  </Text>
                  <Pressable
                    testID="interface-guide-close"
                    accessibilityRole="button"
                    accessibilityLabel="Close guide"
                    onPress={finish}
                    hitSlop={10}
                    style={({ pressed }) => [{ opacity: pressed ? 0.65 : 0.85 }]}
                  >
                    <Text style={[styles.closeGlyph, { color: t.colors.metaFg }]}>×</Text>
                  </Pressable>
                </View>

                <View style={[styles.pagerHost, { width: pagerWidth }]}>
                  <ScrollView
                    ref={scrollRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    bounces={false}
                    decelerationRate="fast"
                    onMomentumScrollEnd={onScrollEnd}
                    scrollEventThrottle={16}
                    style={{ width: pagerWidth }}
                  >
                    {GUIDE_SLIDES.map((slide, index) => {
                      const Visual = slide.Visual;
                      const slideActive = visible && activeIndex === index;
                      return (
                        <View
                          key={slide.key}
                          style={[styles.slide, { width: pagerWidth }]}
                          testID={`interface-guide-slide-${slide.key}`}
                        >
                          <View style={styles.visualSlot}>
                            <GuideSlideEnter active={slideActive} delay={0}>
                              <Visual active={slideActive} />
                            </GuideSlideEnter>
                          </View>
                          <GuideSlideEnter active={slideActive} delay={50}>
                            <GuideSlideTitle
                              text={slide.title}
                              testID={index === 0 ? 'interface-guide-title' : undefined}
                            />
                          </GuideSlideEnter>
                          <GuideSlideEnter active={slideActive} delay={90}>
                            <Text
                              style={[
                                styles.slideLead,
                                {
                                  color: t.colors.fgDim,
                                  fontFamily: typography.body.fontFamily,
                                },
                              ]}
                            >
                              {slide.lead}
                            </Text>
                          </GuideSlideEnter>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>

                <View style={styles.footer}>
                  <View style={styles.dots} accessibilityRole="tablist">
                    {GUIDE_SLIDES.map((slide, index) => {
                      const active = index === activeIndex;
                      return (
                        <GuidePagerDot
                          key={slide.key}
                          testID={`interface-guide-dot-${slide.key}`}
                          active={active}
                          color={active ? t.colors.accent : t.colors.border}
                        />
                      );
                    })}
                  </View>
                  <LinearGradient
                    colors={
                      sunlightMode
                        ? [t.colors.accent, t.colors.borderFocus, 'rgba(200, 210, 255, 0.5)']
                        : [t.colors.accent, t.colors.borderFocus, 'rgba(34, 200, 220, 0.22)']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.ctaRing}
                  >
                    <Pressable
                      testID={isLastSlide ? 'interface-guide-dismiss' : 'interface-guide-next'}
                      accessibilityRole="button"
                      accessibilityLabel={isLastSlide ? 'Got it' : 'Next slide'}
                      onPress={onPrimaryPress}
                      style={({ pressed }) => [
                        styles.cta,
                        {
                          backgroundColor: t.colors.accentSubtle,
                          opacity: pressed ? 0.82 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: t.colors.fg,
                          fontFamily: fonts.medium,
                          fontSize: 15,
                          letterSpacing: 0.24,
                        }}
                      >
                        {isLastSlide ? 'Got it' : 'Next'}
                      </Text>
                    </Pressable>
                  </LinearGradient>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  sheetOuter: {
    overflow: 'visible',
  },
  sheetOuterShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.38,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 18 },
    elevation: 16,
  },
  sheetAuraViolet: {
    position: 'absolute',
    top: -8,
    right: -8,
    bottom: -8,
    left: -8,
    borderRadius: radius.lg + 8,
    backgroundColor: 'transparent',
    shadowColor: '#646eb4',
    shadowOpacity: 0.16,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
  },
  sheetAuraCyan: {
    position: 'absolute',
    top: -18,
    right: -18,
    bottom: -18,
    left: -18,
    borderRadius: radius.lg + 18,
    backgroundColor: 'transparent',
    shadowColor: '#22c8dc',
    shadowOpacity: 0.09,
    shadowRadius: 42,
    shadowOffset: { width: 0, height: 0 },
  },
  sheetBorderRing: {
    padding: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
  },
  sheet: {
    overflow: 'hidden',
    minHeight: 0,
  },
  sheetInnerRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  sheetContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  kicker: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.34,
    textTransform: 'uppercase',
    opacity: 0.88,
  },
  closeGlyph: {
    fontSize: 26,
    lineHeight: 28,
  },
  pagerHost: {
    minHeight: 320,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  slide: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
  visualSlot: {
    minHeight: 268,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  slideTitle: {
    alignSelf: 'center',
    marginTop: spacing.xs,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.38,
    textAlign: 'center',
  },
  slideLead: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.14,
    textAlign: 'center',
    alignSelf: 'stretch',
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  ctaRing: {
    borderRadius: radius.md,
    padding: StyleSheet.hairlineWidth,
  },
  cta: {
    borderRadius: radius.md - StyleSheet.hairlineWidth,
    alignItems: 'center',
    paddingVertical: 13,
  },
});
