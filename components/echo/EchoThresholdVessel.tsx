import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { ECHO_THRESHOLD_GHOST_COUNT } from '../../constants/echoLayer';
import { fonts, screenContentInnerPad, useAppTheme } from '../../theme';
import { echoEmotionalIntensityFromText } from '../../utils/echoEmotionalAtmosphere';
import type { EchoCandidate } from '../../utils/selectEchoCandidates';
import { formatEchoRelativeAge } from '../../utils/formatEchoRelativeAge';
import type { EchoChromeColors } from './echoChrome';
import { echoAccentForKind, echoFragmentBorderForKind } from './echoChrome';
import { ECHO_FRAGMENT_RADIUS, echoFragmentChrome } from './echoVesselChrome';

export type EchoThresholdVesselProps = {
  candidates: readonly EchoCandidate[];
  chrome: EchoChromeColors;
  onEntryPress?: (entry: EchoCandidate) => void;
};

/**
 * Direction A — one primary presence and ghost traces (no list scroll).
 */
export function EchoThresholdVessel({
  candidates,
  chrome,
  onEntryPress,
}: EchoThresholdVesselProps) {
  const t = useAppTheme();
  const fragment = useMemo(() => echoFragmentChrome(t, chrome), [t, chrome]);

  if (candidates.length === 0) {
    return null;
  }

  const primary = candidates[0]!;
  const ghosts = candidates.slice(1, 1 + ECHO_THRESHOLD_GHOST_COUNT);
  const ghostOpacity = 0.34 + echoEmotionalIntensityFromText(primary.text) * 0.14;

  return (
    <View style={styles.shell} testID="echo-threshold-vessel">
      <EchoThresholdPrimary
        entry={primary}
        chrome={chrome}
        fragment={fragment}
        onPress={onEntryPress != null ? () => onEntryPress(primary) : undefined}
      />
      {ghosts.length > 0 ? (
        <View
          style={[styles.ghostBlock, { opacity: ghostOpacity }]}
          testID="echo-threshold-ghosts"
        >
          {ghosts.map((entry) => (
            <Text
              key={entry.id}
              testID={`echo-threshold-ghost-${entry.id}`}
              style={[styles.ghostLine, { color: chrome.subtitle }]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {entry.text}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

type EchoThresholdPrimaryProps = {
  entry: EchoCandidate;
  chrome: EchoChromeColors;
  fragment: ReturnType<typeof echoFragmentChrome>;
  onPress?: () => void;
};

function EchoThresholdPrimary({
  entry,
  chrome,
  fragment,
  onPress,
}: EchoThresholdPrimaryProps) {
  const [pressed, setPressed] = useState(false);
  const isGravity = entry.kind === 'gravity';
  const accent = echoAccentForKind(chrome, entry.kind);
  const borderColor = echoFragmentBorderForKind(chrome, entry.kind);

  return (
    <Pressable
      testID={`echo-threshold-primary-${entry.id}`}
      accessibilityLabel={entry.text}
      accessibilityHint="Opens full text."
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      {...(Platform.OS === 'android' ? { android_ripple: null } : {})}
    >
      <View
        testID={`echo-threshold-primary-surface-${entry.id}`}
        style={[
          styles.primary,
          {
            backgroundColor: fragment.fill,
            borderColor,
          },
          pressed && { backgroundColor: fragment.pressed },
        ]}
      >
        <View style={[styles.dot, { backgroundColor: accent }]} />
        <View style={styles.primaryBody}>
          <Text style={[styles.age, { color: chrome.subtitle }]}>
            {formatEchoRelativeAge(entry.createdAt)}
          </Text>
          <Text
            style={[
              styles.primaryBodyText,
              {
                color: isGravity ? chrome.fragmentBodyGravity : chrome.fragmentBodyDrift,
                fontFamily: fonts.regular,
              },
            ]}
          >
            {entry.text}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  primary: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 22,
    paddingHorizontal: screenContentInnerPad + 6,
    borderRadius: ECHO_FRAGMENT_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    opacity: 0.55,
  },
  primaryBody: {
    flex: 1,
    minWidth: 0,
  },
  age: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.1,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  primaryBodyText: {
    fontSize: 19,
    lineHeight: 28,
    letterSpacing: 0.14,
  },
  ghostBlock: {
    marginTop: 28,
    paddingHorizontal: screenContentInnerPad + 10,
    gap: 14,
  },
  ghostLine: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
    fontStyle: 'italic',
  },
});
