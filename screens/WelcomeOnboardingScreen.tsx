import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmbientBackground } from '../components/AmbientBackground';
import { StreamFlowPanel } from '../components/StreamFlowPanel';
import { setWelcomeCompleted } from '../storage/welcomeFlag';
import { colorsDark, getTheme } from '../theme';

/**
 * Desktop `chinotto-app/src/index.css` — `--chinotto-headline-text-gradient`
 * (used for `.intro-screen-line` / `.stream-empty-title`, `background-clip: text`).
 */
const CHINOTTO_HEADLINE_TEXT_GRADIENT_COLORS = [
  'rgba(255, 255, 255, 0.96)',
  'rgba(198, 206, 255, 0.92)',
  'rgba(255, 255, 255, 0.9)',
  'rgba(255, 220, 200, 0.82)',
] as const;

const CHINOTTO_HEADLINE_TEXT_GRADIENT_LOCATIONS = [0, 0.38, 0.72, 1] as const;

/** CSS `102deg` (0° = up, clockwise): map to expo `start` / `end` with y downward. */
const _h = (102 * Math.PI) / 180;
const CHINOTTO_HEADLINE_TEXT_GRADIENT_START = {
  x: 0.5 - 0.5 * Math.sin(_h),
  y: 0.5 + 0.5 * Math.cos(_h),
} as const;
const CHINOTTO_HEADLINE_TEXT_GRADIENT_END = {
  x: 0.5 + 0.5 * Math.sin(_h),
  y: 0.5 - 0.5 * Math.cos(_h),
} as const;

const HEADLINE_TITLE_FONT_SIZE = 22;
const HEADLINE_TITLE_LINE_HEIGHT = 30;

/** Calm fade + slight lift; staggered brand → visual → copy → CTA (~2.4s to last step start). */
const ENTRANCE_DURATION_MS = 1100;
const ENTRANCE_STAGGER_MS = 320;
const ENTRANCE_Y_OFFSET = 7;
const ENTRANCE_EASING = Easing.out(Easing.cubic);

/** Fixed welcome CTA — not tied to shell appearance (always standard dark look). */
const WELCOME_CTA_SURFACE = {
  gradient: ['#23283A', '#1C2133'] as const,
  pressedGradient: ['#1a1f30', '#151928'] as const,
  borderColor: 'rgba(160,170,255,0.14)',
  textColor: '#cfd3da',
  aura: {
    shadowColor: '#9ca3ff',
    shadowOpacity: 0.19,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 } as const,
    elevation: 4,
  },
} as const;

type Props = {
  onComplete: () => void;
};

function WelcomeHeadlineTitle({
  colorsFg,
  fontFamily,
}: {
  colorsFg: string;
  fontFamily: string;
}) {
  const [gradWordW, setGradWordW] = useState(0);
  const headlineTypo = useMemo(
    () => ({
      fontFamily,
      fontSize: HEADLINE_TITLE_FONT_SIZE,
      lineHeight: HEADLINE_TITLE_LINE_HEIGHT,
      letterSpacing: 0.2,
    }),
    [fontFamily]
  );

  return (
    <View
      accessibilityRole="header"
      accessibilityLabel="Write it down. No structure."
      style={styles.titleRow}
    >
      <Text style={[styles.title, headlineTypo, { color: colorsFg }]}>Write it down. No </Text>
      <Text
        pointerEvents="none"
        importantForAccessibility="no"
        style={[headlineTypo, styles.titleMeasure]}
        onLayout={(e) => setGradWordW(Math.ceil(e.nativeEvent.layout.width))}
      >
        structure
      </Text>
      {gradWordW > 0 ? (
        <MaskedView
          style={{ width: gradWordW, height: HEADLINE_TITLE_LINE_HEIGHT }}
          maskElement={
            <View
              style={{
                width: gradWordW,
                height: HEADLINE_TITLE_LINE_HEIGHT,
                justifyContent: 'center',
              }}
            >
              <Text style={[headlineTypo, { color: '#000000' }]}>structure</Text>
            </View>
          }
        >
          <LinearGradient
            colors={[...CHINOTTO_HEADLINE_TEXT_GRADIENT_COLORS]}
            locations={[...CHINOTTO_HEADLINE_TEXT_GRADIENT_LOCATIONS]}
            start={CHINOTTO_HEADLINE_TEXT_GRADIENT_START}
            end={CHINOTTO_HEADLINE_TEXT_GRADIENT_END}
            style={{ width: gradWordW, height: HEADLINE_TITLE_LINE_HEIGHT }}
          />
        </MaskedView>
      ) : (
        <Text style={[styles.title, headlineTypo, { color: colorsFg }]}>structure</Text>
      )}
    </View>
  );
}

/**
 * First-launch welcome: `StreamFlowPanel` (`linesOnly` + `linesOnlyBlobs` + `ambientSubdued` + welcome
 * draw pacing) — paths and gradient blobs without glass; blobs subdued for screenshots; copy is mobile-specific.
 * Staged entrance (fade + slight lift) is disabled when reduce motion is on.
 *
 * Appearance-independent: copy and CTA always use standard dark palette; spacing/typography scale from baselines only.
 */
export function WelcomeOnboardingScreen({ onComplete }: Props) {
  const t = useMemo(() => getTheme(), []);
  const { typography } = t;
  const [reduceMotion, setReduceMotion] = useState(false);

  const entranceBrand = useRef(new Animated.Value(0)).current;
  const entranceVisual = useRef(new Animated.Value(0)).current;
  const entranceTitle = useRef(new Animated.Value(0)).current;
  const entranceSupport = useRef(new Animated.Value(0)).current;
  const entranceCta = useRef(new Animated.Value(0)).current;
  const runningEntrance = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((rm) => {
      if (cancelled) {
        return;
      }
      setReduceMotion(rm);
      if (rm) {
        entranceBrand.setValue(1);
        entranceVisual.setValue(1);
        entranceTitle.setValue(1);
        entranceSupport.setValue(1);
        entranceCta.setValue(1);
        return;
      }
      const fadeUp = (v: Animated.Value) =>
        Animated.timing(v, {
          toValue: 1,
          duration: ENTRANCE_DURATION_MS,
          easing: ENTRANCE_EASING,
          useNativeDriver: true,
        });
      runningEntrance.current = Animated.stagger(ENTRANCE_STAGGER_MS, [
        fadeUp(entranceBrand),
        fadeUp(entranceVisual),
        fadeUp(entranceTitle),
        fadeUp(entranceSupport),
        fadeUp(entranceCta),
      ]);
      runningEntrance.current.start(({ finished }) => {
        if (finished) {
          runningEntrance.current = null;
        }
      });
    });
    return () => {
      cancelled = true;
      runningEntrance.current?.stop();
      runningEntrance.current = null;
    };
  }, []);

  const entranceStyle = useCallback(
    (v: Animated.Value) => ({
      opacity: v,
      transform: [
        {
          translateY: v.interpolate({
            inputRange: [0, 1],
            outputRange: [ENTRANCE_Y_OFFSET, 0],
          }),
        },
      ],
    }),
    []
  );

  const handleContinue = useCallback(() => {
    void (async () => {
      await setWelcomeCompleted();
      onComplete();
    })();
  }, [onComplete]);

  return (
    <View style={styles.shell}>
      <AmbientBackground fixedChrome />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            testID="welcome-entrance-brand"
            style={[
              styles.brandRow,
              { marginBottom: t.spacing.sm, paddingHorizontal: t.spacing.md },
              entranceStyle(entranceBrand),
            ]}
          >
            <Text
              style={[
                styles.brandWordmark,
                {
                  color: colorsDark.metaFg,
                  fontFamily: typography.capture.fontFamily,
                },
              ]}
              accessibilityRole="text"
            >
              Chinotto
            </Text>
          </Animated.View>

          <Animated.View
            testID="welcome-entrance-visual"
            style={[styles.visual, { marginBottom: t.spacing.md }, entranceStyle(entranceVisual)]}
          >
            <StreamFlowPanel
              calm={reduceMotion}
              deferMotion={false}
              typingAccent={false}
              useAdaptiveChrome={false}
              linesOnly
              linesOnlyBlobs
              linesOnlyDrawPacing="welcome"
              ambientSubdued
            />
          </Animated.View>

          <View style={[styles.copyColumn, { paddingHorizontal: t.spacing.md }]}>
            <Animated.View testID="welcome-entrance-title" style={entranceStyle(entranceTitle)}>
              <WelcomeHeadlineTitle colorsFg={colorsDark.fg} fontFamily={typography.capture.fontFamily} />
            </Animated.View>
            <Animated.View testID="welcome-entrance-support" style={entranceStyle(entranceSupport)}>
              <Text
                style={[
                  styles.lead,
                  {
                    color: colorsDark.fgDim,
                    fontFamily: typography.body.fontFamily,
                    fontSize: typography.body.fontSize,
                    lineHeight: 26,
                    marginTop: t.spacing.md,
                  },
                ]}
              >
                Just write when something comes.{'\n'}
                Nothing to organize.
              </Text>
            </Animated.View>
          </View>

          <Animated.View
            testID="welcome-entrance-cta"
            style={[
              {
                paddingHorizontal: t.spacing.md,
                marginTop: t.spacing.xl,
                marginBottom: t.spacing.xl + t.spacing.md,
                alignItems: 'center',
              },
              entranceStyle(entranceCta),
            ]}
          >
            <Pressable
              testID="welcome-continue"
              accessibilityRole="button"
              accessibilityLabel="Capture"
              onPress={handleContinue}
              style={styles.ctaPressable}
            >
              {({ pressed }) => (
                <LinearGradient
                  colors={[...(pressed ? WELCOME_CTA_SURFACE.pressedGradient : WELCOME_CTA_SURFACE.gradient)]}
                  locations={[0, 1]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={[
                    styles.ctaSurface,
                    {
                      borderColor: WELCOME_CTA_SURFACE.borderColor,
                      transform: [{ scale: pressed ? 0.99 : 1 }],
                      ...Platform.select({
                        ios: {
                          shadowColor: WELCOME_CTA_SURFACE.aura.shadowColor,
                          shadowOffset: WELCOME_CTA_SURFACE.aura.shadowOffset,
                          shadowOpacity: pressed
                            ? WELCOME_CTA_SURFACE.aura.shadowOpacity * 0.75
                            : WELCOME_CTA_SURFACE.aura.shadowOpacity,
                          shadowRadius: pressed
                            ? WELCOME_CTA_SURFACE.aura.shadowRadius * 0.85
                            : WELCOME_CTA_SURFACE.aura.shadowRadius,
                        },
                        android: {
                          elevation: pressed
                            ? Math.max(1, WELCOME_CTA_SURFACE.aura.elevation - 1)
                            : WELCOME_CTA_SURFACE.aura.elevation,
                        },
                        default: {},
                      }),
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: WELCOME_CTA_SURFACE.textColor,
                      fontFamily: typography.body.fontFamily,
                      fontSize: 16,
                      letterSpacing: 0.07,
                    }}
                  >
                    Capture
                  </Text>
                </LinearGradient>
              )}
            </Pressable>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scroll: {
    flexGrow: 1,
    paddingTop: 20,
    paddingBottom: 52,
    justifyContent: 'flex-start',
  },
  brandRow: {
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  brandWordmark: {
    fontSize: 15,
    letterSpacing: 0.42,
    lineHeight: 22,
    textAlign: 'center',
  },
  visual: {
    alignItems: 'center',
    marginTop: 4,
  },
  /** Narrow column so centered lines read as one thought, not full-bleed UI copy. */
  copyColumn: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 340,
  },
  title: {
    textAlign: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleMeasure: {
    position: 'absolute',
    opacity: 0,
    left: -10000,
    top: 0,
  },
  lead: {
    textAlign: 'center',
  },
  /** Centered pill — not a full-bleed CTA bar. */
  ctaPressable: {
    alignSelf: 'center',
    width: '72%',
    maxWidth: 300,
    minWidth: 200,
  },
  ctaSurface: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'visible',
  },
});
