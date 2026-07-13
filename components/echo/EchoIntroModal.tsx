import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, radius, screenContentGutter, spacing, useAppTheme } from '../../theme';

type Props = {
  visible: boolean;
  onDismiss: () => void;
};

/** First-time Echo — why a memory card appears under capture. */
export function EchoIntroModal({ visible, onDismiss }: Props) {
  const t = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const gutter = screenContentGutter(windowWidth);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.52)' }]}
          onPress={onDismiss}
        />
        <View
          style={[
            styles.card,
            {
              marginHorizontal: gutter,
              marginBottom: Math.max(insets.bottom, spacing.lg),
              backgroundColor: t.colors.bgElevated,
              borderColor: t.colors.border,
              borderRadius: radius.lg,
            },
          ]}
        >
          <Text
            testID="echo-intro-title"
            style={[
              styles.title,
              {
                color: t.colors.fg,
                fontFamily: fonts.medium,
              },
            ]}
          >
            Echo
          </Text>
          <Text
            style={[
              styles.body,
              {
                color: t.colors.fgDim,
                fontFamily: t.typography.body.fontFamily,
              },
            ]}
          >
            Sometimes Chinotto surfaces an earlier thought when it may connect to what you are
            capturing now. It is not a reminder or a task — just a quiet thread back.
          </Text>
          <Text
            style={[
              styles.body,
              {
                color: t.colors.metaFg,
                fontFamily: t.typography.meta.fontFamily,
              },
            ]}
          >
            Tap the card to read it like any thought. Use Continue inside the sheet if you want to
            keep writing.
          </Text>
          <Pressable
            testID="echo-intro-dismiss"
            accessibilityRole="button"
            accessibilityLabel="Got it"
            onPress={onDismiss}
            style={({ pressed }) => [
              styles.cta,
              {
                backgroundColor: t.colors.accentSubtle,
                borderColor: t.colors.borderFocus,
                opacity: pressed ? 0.82 : 1,
              },
            ]}
          >
            <Text
              style={{
                color: t.colors.fgDim,
                fontFamily: fonts.medium,
                fontSize: 15,
                letterSpacing: 0.2,
              }}
            >
              Got it
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.12,
  },
  cta: {
    marginTop: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    alignItems: 'center',
    paddingVertical: 12,
  },
});
