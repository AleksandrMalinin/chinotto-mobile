import { StyleSheet, Text, View } from 'react-native';

import { fonts, type AppTheme } from '../theme';
import { VoiceMicButton, type VoiceCaptureControlPhase } from './VoiceCaptureControl';

export type SheetEditVoiceDockProps = {
  phase: VoiceCaptureControlPhase;
  onPress: () => void;
  theme: AppTheme;
};

/**
 * Edit-sheet voice chrome: stable mic anchor; listening status sits beside it (no full-width band).
 */
export function SheetEditVoiceDock({ phase, onPress, theme: t }: SheetEditVoiceDockProps) {
  const listening = phase === 'listening';
  const { meta } = t.typography;

  return (
    <View
      testID="sheet-voice-dock"
      style={[
        styles.dock,
        listening
          ? {
              borderTopColor: t.colors.border,
              borderTopWidth: StyleSheet.hairlineWidth,
              paddingTop: 10,
            }
          : null,
      ]}
    >
      {listening ? (
        <View testID="voice-listening-bar" style={styles.status} accessibilityLiveRegion="polite">
          <View style={[styles.liveDot, { backgroundColor: t.colors.accent }]} />
          <View style={styles.statusCopy}>
            <Text
              style={{
                color: t.colors.fgDim,
                fontFamily: fonts.medium,
                fontSize: 13,
                lineHeight: 18,
                letterSpacing: 0.02,
              }}
            >
              Listening
            </Text>
            <Text
              style={{
                color: t.colors.metaFg,
                fontFamily: meta.fontFamily,
                fontSize: 12,
                lineHeight: 16,
                letterSpacing: 0.02,
              }}
            >
              Tap mic when done
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.statusSpacer} />
      )}
      <VoiceMicButton phase={phase} onPress={onPress} theme={t} placement="inline" />
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 4,
  },
  status: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  statusSpacer: {
    flex: 1,
  },
  statusCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    opacity: 0.92,
  },
});
