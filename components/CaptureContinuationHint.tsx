import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, useAppTheme } from '../theme';
import { streamPreviewFirstLine } from '../utils/streamPreviewFirstLine';
import { TrailHighlightedText } from '../utils/trailHighlight';
import type { CaptureContinuationHint } from '../utils/captureContinuationHint';

type Props = {
  hint: CaptureContinuationHint;
  onOpen: () => void;
  onDismiss: () => void;
};

/** Quiet continuation meta under composer — stream register, not a banner card. */
export function CaptureContinuationHint({ hint, onOpen, onDismiss }: Props) {
  const t = useAppTheme();
  const when =
    hint.days_earlier === 0
      ? 'today'
      : `${hint.days_earlier} day${hint.days_earlier === 1 ? '' : 's'} ago`;
  const previewLine = streamPreviewFirstLine(hint.preview).trim();
  const sharedTerms = hint.shared_terms ?? [];

  return (
    <View
      style={styles.shell}
      testID="capture-continuation-hint"
      accessibilityRole="text"
      accessibilityLabel={
        previewLine
          ? `Continues a thought from ${when}: ${previewLine}`
          : `Continues a thought from ${when}`
      }
    >
      <View style={styles.body}>
        <Text style={[styles.label, { color: t.colors.muted }]}>
          Continues a thought from {when}
        </Text>
        {previewLine ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open related thought"
            onPress={onOpen}
            style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
          >
            <TrailHighlightedText
              text={previewLine}
              terms={sharedTerms}
              style={[styles.preview, { color: t.colors.fgDim }]}
            />
          </Pressable>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss continuation hint"
        onPress={onDismiss}
        hitSlop={8}
        style={({ pressed }) => [styles.dismissBtn, { opacity: pressed ? 0.55 : 0.75 }]}
      >
        <Text style={[styles.dismiss, { color: t.colors.muted }]}>×</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
    marginBottom: 2,
    paddingVertical: 2,
  },
  body: {
    flex: 1,
    gap: 3,
  },
  label: {
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.2,
    opacity: 0.8,
  },
  preview: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.14,
  },
  dismissBtn: {
    paddingTop: 1,
  },
  dismiss: {
    fontFamily: fonts.regular,
    fontSize: 18,
    lineHeight: 20,
  },
});
