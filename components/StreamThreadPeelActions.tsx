import { Pressable, StyleSheet, Text, View } from 'react-native';

import { STREAM_THREAD_PEEL_ACTION_WIDTH } from '../constants/streamThreadPeel';
import type { Entry } from '../types/entry';
import { fonts, useAppTheme } from '../theme';
import { streamPreviewFirstLine } from '../utils/streamPreviewFirstLine';
import { relativeTrailWhen } from '../utils/thoughtTrail';

const MAX_PREVIEW = 48;

function truncate(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max).trimEnd()}…`;
}

type Props = {
  anchor: Entry;
  neighbors: readonly Entry[];
  onSelect: (entry: Entry) => void;
  onClose?: () => void;
};

export function StreamThreadPeelActions({ anchor, neighbors, onSelect, onClose }: Props) {
  const t = useAppTheme();
  const { colors } = t;

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
      {neighbors.map((neighbor) => {
        const preview = truncate(streamPreviewFirstLine(neighbor.text), MAX_PREVIEW);
        const when = relativeTrailWhen(anchor.createdAt, neighbor.createdAt);
        return (
          <Pressable
            key={neighbor.id}
            testID={`stream-thread-peel-${neighbor.id}`}
            accessibilityRole="button"
            accessibilityLabel={`${when}: ${preview}`}
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
                styles.when,
                {
                  color: colors.metaFg,
                  fontFamily: fonts.regular,
                },
              ]}
              numberOfLines={1}
            >
              {when}
            </Text>
            <Text
              style={[
                styles.preview,
                {
                  color: colors.fgDim,
                  fontFamily: fonts.regular,
                },
              ]}
              numberOfLines={2}
            >
              {preview}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 10,
  },
  row: {
    gap: 2,
  },
  when: {
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.12,
    opacity: 0.85,
  },
  preview: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.12,
  },
});
