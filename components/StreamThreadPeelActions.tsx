import { Pressable, StyleSheet, Text, View } from 'react-native';

import { STREAM_THREAD_PEEL_ACTION_WIDTH } from '../constants/streamThreadPeel';
import type { Entry } from '../types/entry';
import { fonts, useAppTheme } from '../theme';
import { streamPreviewFirstLine } from '../utils/streamPreviewFirstLine';

const MAX_PREVIEW = 34;

function truncate(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max).trimEnd()}…`;
}

type Props = {
  neighbors: readonly Entry[];
  onSelect: (entry: Entry) => void;
  onClose?: () => void;
};

/** One related thought beside the row — open sheet for the full trail. */
export function StreamThreadPeelActions({ neighbors, onSelect, onClose }: Props) {
  const t = useAppTheme();
  const { colors } = t;
  const neighbor = neighbors[0];
  if (neighbor == null) {
    return null;
  }

  const preview = truncate(streamPreviewFirstLine(neighbor.text), MAX_PREVIEW);

  return (
    <View
      testID="stream-thread-peel-actions"
      style={[
        styles.track,
        {
          width: STREAM_THREAD_PEEL_ACTION_WIDTH,
          backgroundColor: colors.accentSubtle,
          borderRightWidth: StyleSheet.hairlineWidth,
          borderRightColor: colors.borderFocus,
        },
      ]}
    >
      <Pressable
        testID={`stream-thread-peel-${neighbor.id}`}
        accessibilityRole="button"
        accessibilityLabel={`Related thought: ${preview}`}
        onPress={() => {
          onClose?.();
          onSelect(neighbor);
        }}
        style={({ pressed }) => [
          styles.row,
          { opacity: pressed ? 0.78 : 1 },
        ]}
      >
        <Text
          style={[
            styles.label,
            {
              color: colors.metaFg,
              fontFamily: fonts.regular,
            },
          ]}
          numberOfLines={1}
        >
          Related
        </Text>
        <Text
          style={[
            styles.preview,
            {
              color: colors.fgDim,
              fontFamily: fonts.regular,
            },
          ]}
          numberOfLines={1}
        >
          {preview}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  row: {
    gap: 3,
  },
  label: {
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.14,
    opacity: 0.72,
  },
  preview: {
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: 0.1,
  },
});
