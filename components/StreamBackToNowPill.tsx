import { Pressable, StyleSheet, Text } from 'react-native';

import { fonts, useAppTheme } from '../theme';

type Props = {
  visible: boolean;
  onPress: () => void;
};

export function StreamBackToNowPill({ visible, onPress }: Props) {
  const t = useAppTheme();
  if (!visible) {
    return null;
  }
  return (
    <Pressable
      testID="stream-back-to-now"
      accessibilityRole="button"
      accessibilityLabel="Back to now"
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: t.colors.bg,
          borderColor: t.colors.borderFocus,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <Text style={[styles.label, { color: t.colors.fgDim, fontFamily: fonts.medium }]}>
        Back to now
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.12,
  },
});
