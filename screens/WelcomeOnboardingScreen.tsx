import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
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
import { useAppTheme } from '../theme';

type Props = {
  onComplete: () => void;
};

/**
 * First-launch welcome: `StreamFlowPanel` matches desktop motion spec
 * (`chinotto-app/docs/stream-flow-panel-animation.md`); copy is mobile-specific.
 */
export function WelcomeOnboardingScreen({ onComplete }: Props) {
  const t = useAppTheme();
  const { colors, typography } = t;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  const ctaSurface = useMemo(() => {
    if (t.isDark) {
      return {
        gradient: [
          'rgba(168, 180, 238, 0.2)',
          'rgba(112, 126, 192, 0.12)',
          'rgba(86, 100, 162, 0.09)',
        ] as const,
        shadowColor: '#9aa6e0',
        textColor: colors.entryBody,
      };
    }
    return {
      gradient: [
        'rgba(125, 138, 210, 0.18)',
        'rgba(98, 112, 185, 0.13)',
        'rgba(88, 102, 175, 0.1)',
      ] as const,
      shadowColor: '#8890c8',
      textColor: colors.entryBody,
    };
  }, [t.isDark, colors.entryBody]);

  const handleContinue = useCallback(() => {
    void (async () => {
      await setWelcomeCompleted();
      onComplete();
    })();
  }, [onComplete]);

  return (
    <View style={styles.shell}>
      <AmbientBackground />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.visual, { marginBottom: t.spacing.lg }]}>
            <StreamFlowPanel calm={reduceMotion} deferMotion={false} typingAccent={false} />
          </View>

          <View style={[styles.copyColumn, { paddingHorizontal: t.spacing.md }]}>
            <Text
              style={[
                styles.title,
                {
                  color: colors.fg,
                  fontFamily: typography.capture.fontFamily,
                  fontSize: 22,
                  lineHeight: 30,
                  letterSpacing: 0.2,
                },
              ]}
            >
              Write it down. No structure.
            </Text>
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
              Just capture the thought.{'\n'}
              No folders, no tags.
            </Text>
            <Text
              style={[
                styles.meta,
                {
                  color: colors.metaFg,
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.body.fontSize,
                  lineHeight: 26,
                  marginTop: t.spacing.lg,
                },
              ]}
            >
              Your recent thoughts stay close.{'\n'}
              Nothing to file or sort.
            </Text>
          </View>

          <View
            style={{
              paddingHorizontal: t.spacing.md,
              marginTop: t.spacing.xl + t.spacing.lg,
              marginBottom: t.spacing.xl + t.spacing.md,
              alignItems: 'center',
            }}
          >
            <Pressable
              testID="welcome-continue"
              accessibilityRole="button"
              accessibilityLabel="Capture it"
              onPress={handleContinue}
              style={({ pressed }) => [styles.ctaPressable, { opacity: pressed ? 0.9 : 1 }]}
            >
              <View
                style={[
                  styles.ctaShadow,
                  Platform.OS === 'ios'
                    ? {
                        shadowColor: ctaSurface.shadowColor,
                        shadowOffset: { width: 0, height: 5 },
                        shadowOpacity: 0.16,
                        shadowRadius: 22,
                      }
                    : { elevation: 4 },
                ]}
              >
                <LinearGradient
                  colors={[...ctaSurface.gradient]}
                  locations={[0, 0.42, 1]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.ctaGradient}
                >
                  <Text
                    style={{
                      color: ctaSurface.textColor,
                      fontFamily: typography.body.fontFamily,
                      fontSize: 16,
                      letterSpacing: 0.07,
                    }}
                  >
                    Capture it
                  </Text>
                </LinearGradient>
              </View>
            </Pressable>
          </View>
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
  lead: {
    textAlign: 'center',
  },
  meta: {
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
  },
});
