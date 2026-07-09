import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, useAppTheme } from '../../theme';

export type EchoSwipeRecallHintProps = {
  visible: boolean;
  onDismiss?: () => void;
};

/** One-time whisper under composer — the only Echo discoverability copy on stream. */
export function EchoSwipeRecallHint({ visible, onDismiss }: EchoSwipeRecallHintProps) {
  const t = useAppTheme();
  if (!visible) {
    return null;
  }
  return (
    <View style={styles.row} testID="echo-swipe-recall-hint">
      <Text style={[styles.copy, { color: t.colors.muted }]}>
        Swipe right for a thought from earlier
      </Text>
      {onDismiss ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss hint"
          onPress={onDismiss}
          hitSlop={8}
          style={({ pressed }) => [{ opacity: pressed ? 0.55 : 0.85 }]}
        >
          <Text style={[styles.dismiss, { color: t.colors.muted }]}>×</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 2,
    gap: 8,
  },
  copy: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.25,
    opacity: 0.72,
  },
  dismiss: {
    fontFamily: fonts.regular,
    fontSize: 17,
    lineHeight: 19,
    opacity: 0.65,
  },
});
