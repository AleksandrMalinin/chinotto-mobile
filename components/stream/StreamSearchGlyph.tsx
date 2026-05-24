import { StyleSheet, View } from 'react-native';

type StreamSearchGlyphProps = {
  color: string;
  size?: number;
  active?: boolean;
};

/** Minimal loupe — not a stock icon font glyph. */
export function StreamSearchGlyph({ color, size = 15, active = false }: StreamSearchGlyphProps) {
  const ring = size;
  const stroke = Math.max(1.5, size * 0.11);
  const offset = stroke * 1.1;

  return (
    <View
      style={[styles.host, { width: ring + offset * 2.2, height: ring + offset * 2.2 }]}
      importantForAccessibility="no"
      accessibilityElementsHidden
    >
      <View
        style={[
          styles.ring,
          {
            width: ring,
            height: ring,
            borderRadius: ring / 2,
            borderWidth: stroke,
            borderColor: color,
            opacity: active ? 1 : 0.82,
            top: 0,
            left: 0,
          },
        ]}
      />
      <View
        style={[
          styles.stem,
          {
            width: stroke * 2.6,
            height: stroke,
            backgroundColor: color,
            borderRadius: stroke,
            bottom: offset * 0.15,
            right: offset * 0.35,
            opacity: active ? 1 : 0.78,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'relative',
  },
  ring: {
    position: 'absolute',
  },
  stem: {
    position: 'absolute',
    transform: [{ rotate: '45deg' }],
  },
});
