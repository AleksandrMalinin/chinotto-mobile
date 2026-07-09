import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, useAppTheme } from '../theme';

export type SpatialGestureHintProps = {
  testID: string;
  message: string;
  visible: boolean;
  onDismiss: () => void;
};

/** One-line discoverability under composer — same register as continuation hint. */
export function SpatialGestureHint({ testID, message, visible, onDismiss }: SpatialGestureHintProps) {
  const t = useAppTheme();
  if (!visible) {
    return null;
  }
  return (
    <View style={styles.row} testID={testID} accessibilityRole="text">
      <Text style={[styles.copy, { color: t.colors.muted }]}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss hint"
        onPress={onDismiss}
        hitSlop={8}
        style={({ pressed }) => [{ opacity: pressed ? 0.55 : 0.85 }]}
      >
        <Text style={[styles.dismiss, { color: t.colors.muted }]}>×</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 6,
    marginBottom: 2,
  },
  copy: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.22,
    opacity: 0.82,
  },
  dismiss: {
    fontFamily: fonts.regular,
    fontSize: 17,
    lineHeight: 19,
    opacity: 0.65,
  },
});
