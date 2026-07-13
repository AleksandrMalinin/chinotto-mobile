import { StyleSheet, Text, View } from 'react-native';

import type { Entry } from '../../types/entry';
import { fonts, screenContentInnerPad, useAppTheme } from '../../theme';
import { formatEntryTime } from '../../utils/groupEntriesByDate';
import { streamPreviewFirstLine } from '../../utils/streamPreviewFirstLine';

const TRAIL_MARK_SIZE = 6;
const TRAIL_MARK_GLOW = 10;
const ENTRY_FONT_SIZE = 15;
const ENTRY_LINE_HEIGHT = 21;

type RowProps = {
  entry: Entry;
  hasTrail?: boolean;
  dimmed?: boolean;
};

export function GuideStreamSectionLabel({
  label,
  highlight,
}: {
  label: string;
  highlight?: boolean;
}) {
  const t = useAppTheme();
  const { meta } = t.typography;

  return (
    <View style={highlight ? styles.highlightWrap : undefined}>
      {highlight ? <View style={[styles.highlightRing, { borderColor: t.colors.borderFocus }]} /> : null}
      <Text
        style={[
          styles.sectionLabel,
          {
            color: t.colors.sectionFg,
            fontFamily: meta.fontFamily,
            opacity: t.sunlightMode ? 1 : 0.7,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function GuideStreamRow({ entry, hasTrail = false, dimmed = false }: RowProps) {
  const t = useAppTheme();
  const { body } = t.typography;
  const preview = streamPreviewFirstLine(entry.text);

  return (
    <View style={[styles.rowOuter, dimmed ? styles.rowDimmed : null]}>
      <View style={styles.entryRow}>
        {hasTrail ? (
          <View style={styles.trailMarkGutter}>
            <View style={[styles.trailMarkGlow, { backgroundColor: t.colors.accentSubtle }]} />
            <View style={[styles.trailMark, { backgroundColor: t.colors.atmosphereSoft }]} />
          </View>
        ) : null}
        <Text
          style={[
            styles.line,
            {
              color: t.colors.entryBody,
              fontFamily: body.fontFamily,
            },
          ]}
          numberOfLines={2}
        >
          {preview}
        </Text>
      </View>
      <Text
        style={[
          styles.inlineTime,
          {
            color: t.colors.metaFg,
            fontFamily: t.typography.meta.fontFamily,
          },
        ]}
      >
        {formatEntryTime(entry.createdAt)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  highlightWrap: {
    alignSelf: 'flex-start',
    position: 'relative',
  },
  highlightRing: {
    position: 'absolute',
    top: -4,
    right: -8,
    bottom: -4,
    left: -8,
    borderRadius: 8,
    borderWidth: 1,
    opacity: 0.65,
  },
  sectionLabel: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.08,
    marginBottom: 6,
  },
  rowOuter: {
    gap: 2,
    marginBottom: 10,
  },
  rowDimmed: {
    opacity: 0.42,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
    minHeight: ENTRY_LINE_HEIGHT,
  },
  trailMarkGutter: {
    position: 'absolute',
    left: -screenContentInnerPad - TRAIL_MARK_GLOW + 2,
    top: (ENTRY_LINE_HEIGHT - TRAIL_MARK_GLOW) / 2,
    width: TRAIL_MARK_GLOW,
    height: TRAIL_MARK_GLOW,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trailMarkGlow: {
    position: 'absolute',
    width: TRAIL_MARK_GLOW,
    height: TRAIL_MARK_GLOW,
    borderRadius: TRAIL_MARK_GLOW / 2,
  },
  trailMark: {
    width: TRAIL_MARK_SIZE,
    height: TRAIL_MARK_SIZE,
    borderRadius: TRAIL_MARK_SIZE / 2,
  },
  line: {
    flex: 1,
    fontSize: ENTRY_FONT_SIZE,
    lineHeight: ENTRY_LINE_HEIGHT,
    letterSpacing: 0.14,
  },
  inlineTime: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.12,
    opacity: 0.75,
    paddingLeft: 2,
  },
});
