import { useCallback, useEffect, useState } from 'react';
import {
  AccessibilityInfo,
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
 * First-launch welcome: same copy intent as desktop `EmptyStreamOnboarding` +
 * `StreamFlowPanel` (see `chinotto-app/docs/stream-flow-panel-animation.md`).
 */
export function WelcomeOnboardingScreen({ onComplete }: Props) {
  const t = useAppTheme();
  const { colors, typography } = t;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

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

          <View style={{ paddingHorizontal: t.spacing.md }}>
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
              Just write. No structure.
            </Text>
            <Text
              style={[
                styles.lead,
                {
                  color: colors.fgDim,
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.body.fontSize,
                  lineHeight: typography.body.lineHeight,
                  marginTop: t.spacing.sm,
                },
              ]}
            >
              Start with one line.
            </Text>
            <Text
              style={[
                styles.meta,
                {
                  color: colors.metaFg,
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.body.fontSize,
                  lineHeight: typography.body.lineHeight,
                  marginTop: t.spacing.md,
                },
              ]}
            >
              Your thoughts leave a trail.{'\n'}
              You’ll see them again when it matters.
            </Text>
          </View>

          <View style={{ paddingHorizontal: t.spacing.md, marginTop: t.spacing.xl }}>
            <Pressable
              testID="welcome-continue"
              accessibilityRole="button"
              accessibilityLabel="Continue to capture"
              onPress={handleContinue}
              style={({ pressed }) => [
                styles.cta,
                {
                  backgroundColor: 'rgba(128,138,188,0.14)',
                  borderColor: colors.border,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
            >
              <Text
                style={{
                  color: colors.fg,
                  fontFamily: typography.capture.fontFamily,
                  fontSize: 17,
                  letterSpacing: 0.15,
                }}
              >
                Continue
              </Text>
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
    paddingBottom: 32,
    justifyContent: 'center',
  },
  visual: {
    alignItems: 'center',
    marginTop: 8,
  },
  title: {},
  lead: {},
  meta: {},
  cta: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
