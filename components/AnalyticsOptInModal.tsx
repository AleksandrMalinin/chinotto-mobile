import { useCallback, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { setAnalyticsPromptShown, setOptIn } from '../analytics/analytics';
import { fonts, radius, screenContentGutter, spacing, useAppTheme } from '../theme';

const EXPLAINER =
  'We send only simple event names and numbers — for example “sync opened” or “purchase outcome” with a category. We never send the text of your thoughts, your search query, or any personal identifier. All thoughts stay on your device. You can turn this off anytime in Settings.';

type Props = {
  visible: boolean;
  onClose: () => void;
};

/**
 * One-time anonymous analytics opt-in (Umami), aligned with chinotto-app `AnalyticsOptInModal`.
 */
export function AnalyticsOptInModal({ visible, onClose }: Props) {
  const t = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const gutter = screenContentGutter(windowWidth);
  const [learnMore, setLearnMore] = useState(false);
  const scrollMaxHeight = Math.min(windowHeight * 0.72, 520);

  const finish = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleAllow = useCallback(() => {
    setOptIn(true);
    void setAnalyticsPromptShown();
    finish();
  }, [finish]);

  const handleDecline = useCallback(() => {
    setOptIn(false);
    void setAnalyticsPromptShown();
    finish();
  }, [finish]);

  /** Backdrop tap: dismiss prompt without changing prior opt-in (default stays off). */
  const handleBackdrop = useCallback(() => {
    void setAnalyticsPromptShown();
    finish();
  }, [finish]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={handleBackdrop}
    >
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.52)' }]}
          onPress={handleBackdrop}
        />
        <View
          pointerEvents="box-none"
          style={[
            styles.centerSheet,
            {
              paddingHorizontal: gutter,
              paddingTop: Math.max(insets.top, spacing.md),
              paddingBottom: Math.max(insets.bottom, spacing.md),
            },
          ]}
        >
          <View
            style={[
              styles.card,
              {
                width: '100%',
                maxWidth: 400,
                backgroundColor: t.colors.bgElevated,
                borderColor: t.colors.border,
              },
            ]}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={learnMore}
              bounces={false}
              style={{ maxHeight: scrollMaxHeight }}
              contentContainerStyle={styles.scrollContent}
            >
              <Text
                style={[styles.title, { color: t.colors.fg, fontFamily: fonts.medium }]}
                accessibilityRole="header"
              >
                Analytics (optional)
              </Text>
              <Text style={[styles.body, { color: t.colors.fgDim, fontFamily: fonts.regular }]}>
                Chinotto can send anonymous usage events to help improve the app. Your thoughts and search text are
                never sent. You can disable this anytime in Settings.
              </Text>
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Allow analytics"
                  onPress={handleAllow}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    {
                      backgroundColor: t.colors.accentSubtle,
                      borderColor: t.colors.borderFocus,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.primaryLabel, { color: t.colors.fg, fontFamily: fonts.medium }]}>
                    Allow analytics
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="No thanks"
                  onPress={handleDecline}
                  style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.85 : 1 }]}
                >
                  <Text style={[styles.secondaryLabel, { color: t.colors.metaFg, fontFamily: fonts.medium }]}>
                    No thanks
                  </Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() => setLearnMore((v) => !v)}
                style={styles.learnMoreHit}
                accessibilityRole="button"
                accessibilityLabel={learnMore ? 'Hide details' : 'Learn more'}
              >
                <Text style={[styles.learnMore, { color: t.colors.accent, fontFamily: fonts.regular }]}>
                  {learnMore ? 'Hide details' : 'Learn more'}
                </Text>
              </Pressable>
              {learnMore ? (
                <Text style={[styles.explainer, { color: t.colors.muted, fontFamily: fonts.regular }]}>
                  {EXPLAINER}
                </Text>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  centerSheet: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
  },
  scrollContent: {
    flexGrow: 0,
  },
  title: {
    fontSize: 20,
    letterSpacing: 0.2,
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.15,
  },
  actions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  primaryBtn: {
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  primaryLabel: {
    fontSize: 16,
  },
  secondaryBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryLabel: {
    fontSize: 15,
  },
  learnMoreHit: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  learnMore: {
    fontSize: 14,
  },
  explainer: {
    marginTop: spacing.sm,
    fontSize: 13,
    lineHeight: 19,
  },
});
