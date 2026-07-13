import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { fonts, radius, screenContentGutter, spacing, useAppTheme } from '../../theme';
import { resolveGuidePreviewDesignWidth } from './guidePreviewMetrics';
import { formatEntryTime } from '../../utils/groupEntriesByDate';
import type { Entry } from '../../types/entry';

type Props = {
  entry: Entry;
  highlightContinue?: boolean;
  children?: React.ReactNode;
};

/** Compact thought sheet chrome — matches `EntryThoughtSheet` read mode. */
export function GuideSheetPreview({ entry, highlightContinue = false, children }: Props) {
  const t = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const contentInset = screenContentGutter(resolveGuidePreviewDesignWidth(windowWidth));
  const { colors, typography } = t;
  const { meta, body } = typography;

  return (
    <View
      style={[
        styles.sheet,
        {
          backgroundColor: colors.bgElevated,
          borderColor: colors.border,
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
        },
      ]}
      pointerEvents="none"
    >
      <View style={[styles.grabberZone, { paddingHorizontal: contentInset }]}>
        <View style={[styles.grabber, { backgroundColor: colors.muted }]} />
      </View>
      <View style={[styles.toolbarTopRow, { paddingHorizontal: contentInset }]}>
        <Text
          style={[
            styles.metaTime,
            {
              color: colors.metaFg,
              fontFamily: meta.fontFamily,
              fontSize: meta.fontSize,
            },
          ]}
          numberOfLines={1}
        >
          {formatEntryTime(entry.createdAt)}
        </Text>
        <View style={styles.toolbarActions}>
          {highlightContinue ? (
            <View
              style={[
                styles.continueHighlight,
                { borderColor: colors.borderFocus, backgroundColor: colors.accentSubtle },
              ]}
            >
              <Text style={{ color: colors.accent, fontFamily: fonts.medium, fontSize: 15, letterSpacing: 0.2 }}>
                Continue
              </Text>
            </View>
          ) : null}
          <Text style={{ color: colors.fgDim, fontFamily: fonts.medium, fontSize: 15, letterSpacing: 0.2 }}>
            Copy
          </Text>
        </View>
      </View>
      <Text
        style={[
          styles.body,
          {
            color: colors.entryBody,
            fontFamily: body.fontFamily,
            fontSize: body.fontSize,
            lineHeight: body.lineHeight,
            paddingHorizontal: contentInset,
          },
        ]}
        numberOfLines={3}
      >
        {entry.text}
      </Text>
      {children ? (
        <View style={{ marginTop: spacing.sm, paddingHorizontal: contentInset }}>{children}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    paddingBottom: spacing.md,
    marginTop: 'auto',
  },
  grabberZone: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 999,
    opacity: 0.55,
  },
  toolbarTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  metaTime: {
    flex: 1,
    minWidth: 0,
  },
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  continueHighlight: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  body: {
    marginTop: spacing.sm,
    letterSpacing: 0.14,
  },
});
