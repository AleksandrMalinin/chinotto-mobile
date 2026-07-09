import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Entry } from '../types/entry';
import { useAppTheme } from '../theme';
import { streamPreviewFirstLine } from '../utils/streamPreviewFirstLine';
import { relativeTrailWhen } from '../utils/thoughtTrail';
import { sharedKeywords } from '../utils/sharedKeywords';
import { TrailHighlightedText } from '../utils/trailHighlight';

type Props = {
  current: Entry;
  earlier: readonly Entry[];
  later: readonly Entry[];
  onSelect: (entry: Entry) => void;
};

const MAX_PREVIEW = 96;
const MAX_PER_SIDE = 2;

function truncate(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max).trimEnd()}…`;
}

/** Neighbor thoughts in sheet — same row rhythm as stream, no section chrome. */
export function ThoughtTrailRail({ current, earlier, later, onSelect }: Props) {
  const t = useAppTheme();
  const { colors, typography } = t;
  const { body, meta } = typography;
  const earlierVisible = earlier.slice(0, MAX_PER_SIDE);
  const laterVisible = later.slice(0, MAX_PER_SIDE);
  const rows = [
    ...earlierVisible.map((entry) => ({ entry, side: 'earlier' as const })),
    ...laterVisible.map((entry) => ({ entry, side: 'later' as const })),
  ];
  if (rows.length === 0) {
    return null;
  }

  return (
    <View testID="thought-trail-rail" style={styles.shell}>
      {rows.map(({ entry }, index) => {
        const preview = truncate(streamPreviewFirstLine(entry.text), MAX_PREVIEW);
        const shared = sharedKeywords(current.text, entry.text, 4);
        return (
          <View key={entry.id}>
            {index > 0 ? (
              <View style={[styles.hairline, { backgroundColor: colors.border }]} />
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${relativeTrailWhen(current.createdAt, entry.createdAt)}: ${preview}`}
              onPress={() => onSelect(entry)}
              style={({ pressed }) => [
                styles.row,
                { opacity: pressed ? 0.78 : 1 },
              ]}
            >
              <Text
                style={[
                  styles.when,
                  {
                    color: colors.sectionFg,
                    fontFamily: meta.fontFamily,
                  },
                ]}
              >
                {relativeTrailWhen(current.createdAt, entry.createdAt)}
              </Text>
              <TrailHighlightedText
                text={preview}
                terms={shared}
                style={[
                  styles.preview,
                  {
                    color: colors.fgDim,
                    fontFamily: body.fontFamily,
                    fontSize: 14,
                    lineHeight: 20,
                  },
                ]}
              />
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    marginTop: 16,
    paddingTop: 4,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  row: {
    gap: 4,
  },
  when: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.08,
    opacity: 0.72,
  },
  preview: {
    letterSpacing: 0.14,
  },
});
