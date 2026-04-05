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
import { getTheme } from '../theme';

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

/** Calm fade + slight lift; very slow stagger — last step finishes ~2.1s after start. */
const ENTRANCE_DURATION_MS = 1100;
const ENTRANCE_STAGGER_MS = 320;
const ENTRANCE_Y_OFFSET = 7;
const ENTRANCE_EASING = Easing.out(Easing.cubic);

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
 * First-launch welcome: `StreamFlowPanel` matches desktop motion spec
 * (`chinotto-app/docs/stream-flow-panel-animation.md`); copy is mobile-specific.
 * Staged entrance (fade + slight lift) is disabled when reduce motion is on.
 */
export function WelcomeOnboardingScreen({ onComplete }: Props) {
  /** Standard dark chrome only — do not follow adaptive Sunlight (headline SVG / panel tint stay aligned). */
  const t = useMemo(() => getTheme(), []);
  const { colors, typography } = t;
  const [reduceMotion, setReduceMotion] = useState(false);

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

  const ctaSurface = useMemo(() => {
    if (t.sunlightMode) {
      return {
        gradient: [
          'rgba(120,130,188,0.42)',
          'rgba(105,115,175,0.38)',
          'rgba(95,105,165,0.36)',
        ] as const,
        shadowColor: 'rgba(80, 90, 140, 0.45)',
        borderColor: 'rgba(160,170,220,0.45)',
        borderTopColor: 'rgba(190,198,240,0.5)',
        textColor: colors.fg,
      };
    }
    if (t.isDark) {
      return {
        gradient: [
          'rgba(160,170,255,0.24)',
          'rgba(136,150,230,0.2)',
          'rgba(110,124,202,0.16)',
        ] as const,
        shadowColor: '#a0aaff',
        borderColor: 'rgba(160,170,255,0.34)',
        borderTopColor: 'rgba(188,196,255,0.5)',
        textColor: colors.fg,
      };
    }
    return {
      gradient: [
        'rgba(125, 138, 210, 0.18)',
        'rgba(98, 112, 185, 0.13)',
        'rgba(88, 102, 175, 0.1)',
      ] as const,
      shadowColor: '#8890c8',
      borderColor: 'rgba(125, 138, 210, 0.28)',
      borderTopColor: 'rgba(155, 166, 232, 0.45)',
      textColor: colors.entryBody,
    };
  }, [t.isDark, t.sunlightMode, colors.entryBody, colors.fg]);

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
            testID="welcome-entrance-visual"
            style={[styles.visual, { marginBottom: t.spacing.lg }, entranceStyle(entranceVisual)]}
          >
            <StreamFlowPanel calm={reduceMotion} deferMotion={false} typingAccent={false} useAdaptiveChrome={false} />
          </Animated.View>

          <View style={[styles.copyColumn, { paddingHorizontal: t.spacing.md }]}>
            <Animated.View testID="welcome-entrance-title" style={entranceStyle(entranceTitle)}>
              <WelcomeHeadlineTitle colorsFg={colors.fg} fontFamily={typography.capture.fontFamily} />
            </Animated.View>
            <Animated.View testID="welcome-entrance-support" style={entranceStyle(entranceSupport)}>
              <Text
                style={[
                  styles.lead,
                  {
                    color: colors.fgDim,
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
                marginTop: t.spacing.xl + t.spacing.lg,
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
              style={({ pressed }) => [styles.ctaPressable, { opacity: pressed ? 0.9 : 1 }]}
            >
              <View
                style={[
                  styles.ctaShadow,
                  Platform.OS === 'ios'
                    ? {
                        shadowColor: ctaSurface.shadowColor,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: t.sunlightMode ? 0.12 : 0.22,
                        shadowRadius: t.sunlightMode ? 6 : 14,
                      }
                    : { elevation: t.sunlightMode ? 2 : 4 },
                ]}
              >
                <LinearGradient
                  colors={[...ctaSurface.gradient]}
                  locations={[0, 0.42, 1]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={[
                    styles.ctaGradient,
                    {
                      borderColor: ctaSurface.borderColor,
                      borderTopColor: ctaSurface.borderTopColor,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: ctaSurface.textColor,
                      fontFamily: typography.body.fontFamily,
                      fontSize: 16,
                      letterSpacing: 0.07,
                    }}
                  >
                    Capture
                  </Text>
                </LinearGradient>
              </View>
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
    paddingBottom: 40,
    justifyContent: 'center',
  },
  visual: {
    alignItems: 'center',
    marginTop: 8,
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
  ctaShadow: {
    width: '100%',
    borderRadius: 999,
  },
  ctaGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
