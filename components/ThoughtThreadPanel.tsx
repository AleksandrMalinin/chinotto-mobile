import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Entry } from '../types/entry';
import { fonts, useAppTheme } from '../theme';
import { streamPreviewFirstLine } from '../utils/streamPreviewFirstLine';
import { sharedKeywords } from '../utils/sharedKeywords';
import { relativeTrailWhen } from '../utils/thoughtTrail';
import { TrailHighlightedText } from '../utils/trailHighlight';

type Props = {
  current: Entry;
  earlier: readonly Entry[];
  later: readonly Entry[];
  onSelect: (entry: Entry) => void;
};

const MAX_PREVIEW = 96;
const MAX_PER_SIDE = 2;
const MAX_SHARED_CHIPS = 5;

function truncate(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max).trimEnd()}…`;
}

function threadSharedKeywords(current: Entry, neighbors: readonly Entry[], limit: number): string[] {
  const terms = new Set<string>();
  for (const neighbor of neighbors) {
    for (const term of sharedKeywords(current.text, neighbor.text, limit)) {
      terms.add(term);
      if (terms.size >= limit) {
        return [...terms].sort();
      }
    }
  }
  return [...terms].sort();
}

function NeighborRow({
  current,
  entry,
  onSelect,
}: {
  current: Entry;
  entry: Entry;
  onSelect: (entry: Entry) => void;
}) {
  const t = useAppTheme();
  const { colors, typography, radius } = t;
  const { body } = typography;
  const preview = truncate(streamPreviewFirstLine(entry.text), MAX_PREVIEW);
  const shared = sharedKeywords(current.text, entry.text, 4);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${relativeTrailWhen(current.createdAt, entry.createdAt)}: ${preview}`}
      onPress={() => onSelect(entry)}
      style={({ pressed }) => [
        styles.neighborRow,
        {
          backgroundColor: colors.accentSubtle,
          borderRadius: radius.sm,
          opacity: pressed ? 0.78 : 1,
        },
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
  );
}

/** Related thoughts in compact sheet — section chrome, shared terms, earlier/later groups. */
export function ThoughtThreadPanel({ current, earlier, later, onSelect }: Props) {
  const t = useAppTheme();
  const { colors, typography } = t;
  const { meta } = typography;
  const earlierVisible = earlier.slice(0, MAX_PER_SIDE);
  const laterVisible = later.slice(0, MAX_PER_SIDE);
  const allVisible = [...earlierVisible, ...laterVisible];

  if (allVisible.length === 0) {
    return null;
  }

  const sharedChips = threadSharedKeywords(current, allVisible, MAX_SHARED_CHIPS);
  const countLabel = `${allVisible.length} related`;

  return (
    <View testID="thought-thread-panel" style={styles.shell}>
      <View style={[styles.topRule, { backgroundColor: colors.border }]} />
      <View style={styles.headerBlock}>
        <View style={styles.headerRow}>
          <Text
            testID="thought-thread-panel-title"
            style={[
              styles.title,
              {
                color: colors.sectionFg,
                fontFamily: meta.fontFamily,
              },
            ]}
          >
            Thread
          </Text>
          <Text
            style={[
              styles.count,
              {
                color: colors.metaFg,
                fontFamily: meta.fontFamily,
              },
            ]}
          >
            · {countLabel}
          </Text>
        </View>
        <Text
          testID="thought-thread-panel-subtitle"
          style={[
            styles.subtitle,
            {
              color: colors.metaFg,
              fontFamily: meta.fontFamily,
            },
          ]}
        >
          Linked by shared words
        </Text>
      </View>
      {sharedChips.length > 0 ? (
        <View testID="thought-thread-shared-chips" style={styles.chipRow}>
          {sharedChips.map((term) => (
            <View
              key={term}
              style={[
                styles.chip,
                {
                  backgroundColor: colors.accentSubtle,
                  borderColor: colors.borderFocus,
                },
              ]}
            >
              <Text
                style={{
                  color: colors.accent,
                  fontFamily: fonts.regular,
                  fontSize: 11,
                  lineHeight: 14,
                  letterSpacing: 0.12,
                  opacity: 0.92,
                }}
              >
                {term}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {earlierVisible.length > 0 ? (
        <View style={styles.group}>
          <Text
            testID="thought-thread-earlier-label"
            style={[
              styles.groupLabel,
              {
                color: colors.metaFg,
                fontFamily: meta.fontFamily,
              },
            ]}
          >
            Earlier
          </Text>
          <View style={styles.groupRows}>
            {earlierVisible.map((entry) => (
              <NeighborRow key={entry.id} current={current} entry={entry} onSelect={onSelect} />
            ))}
          </View>
        </View>
      ) : null}
      {laterVisible.length > 0 ? (
        <View style={styles.group}>
          <Text
            testID="thought-thread-later-label"
            style={[
              styles.groupLabel,
              {
                color: colors.metaFg,
                fontFamily: meta.fontFamily,
              },
            ]}
          >
            Later
          </Text>
          <View style={styles.groupRows}>
            {laterVisible.map((entry) => (
              <NeighborRow key={entry.id} current={current} entry={entry} onSelect={onSelect} />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    marginTop: 20,
    gap: 12,
  },
  topRule: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  headerBlock: {
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  subtitle: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.14,
    opacity: 0.82,
  },
  title: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.28,
    textTransform: 'uppercase',
  },
  count: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.08,
    opacity: 0.8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  group: {
    gap: 8,
  },
  groupLabel: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.2,
    opacity: 0.78,
  },
  groupRows: {
    gap: 8,
  },
  neighborRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  when: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.1,
    opacity: 0.82,
  },
  preview: {
    letterSpacing: 0.14,
  },
});
