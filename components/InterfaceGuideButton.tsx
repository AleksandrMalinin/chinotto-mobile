import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { InterfaceGuideGlyph } from './InterfaceGuideGlyph';
import { useAppTheme } from '../theme';

type Props = {
  onPress: () => void;
  glyphSize?: number;
  /** Mirror of logo `marginLeft: -chinottoLogoLeadingOutset(size)`. */
  alignStyle?: StyleProp<ViewStyle>;
};

/** Opens the interface guide — trailing header affordance, aligned to the content gutter. */
export function InterfaceGuideButton({ onPress, glyphSize = 28, alignStyle }: Props) {
  const t = useAppTheme();

  return (
    <Pressable
      testID="interface-guide-button"
      accessibilityRole="button"
      accessibilityLabel="How Chinotto works"
      accessibilityHint="Opens a short guide to gestures and features"
      hitSlop={12}
      onPress={onPress}
      style={({ pressed }) => [
        styles.hit,
        alignStyle,
        { opacity: pressed ? 0.72 : 1 },
      ]}
    >
      <InterfaceGuideGlyph size={glyphSize} color={t.colors.metaFg} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
