import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { EchoCandidate } from '../../utils/selectEchoCandidates';
import { fonts, screenContentInnerPad, useAppTheme } from '../../theme';
import { formatEchoRelativeAge } from '../../utils/formatEchoRelativeAge';
import type { EchoChromeColors } from './echoChrome';
import { echoAccentForKind, echoFragmentBorderForKind } from './echoChrome';
import { ECHO_FRAGMENT_RADIUS, echoFragmentChrome } from './echoVesselChrome';

export type EchoMemoryVesselProps = {
  candidates: readonly EchoCandidate[];
  chrome: EchoChromeColors;
  onEntryPress?: (entry: EchoCandidate) => void;
};

type EchoMemoryFragmentProps = {
  entry: EchoCandidate;
  chrome: EchoChromeColors;
  fragment: ReturnType<typeof echoFragmentChrome>;
  onPress?: () => void;
};

function EchoMemoryFragment({
  entry,
  chrome,
  fragment,
  onPress,
}: EchoMemoryFragmentProps) {
  const [pressed, setPressed] = useState(false);
  const isGravity = entry.kind === 'gravity';
  const accent = echoAccentForKind(chrome, entry.kind);
  const borderColor = echoFragmentBorderForKind(chrome, entry.kind);

  return (
    <Pressable
      testID={`echo-fragment-${entry.id}`}
      accessibilityLabel={entry.text}
      accessibilityHint="Opens full text."
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      {...(Platform.OS === 'android' ? { android_ripple: null } : {})}
    >
      <View
        testID={`echo-fragment-surface-${entry.id}`}
        style={[
          styles.fragment,
          {
            backgroundColor: fragment.fill,
            borderColor,
          },
          pressed && { backgroundColor: fragment.pressed },
        ]}
      >
        <View style={[styles.dot, { backgroundColor: accent }]} />
        <View style={styles.fragmentBody}>
          <Text style={[styles.age, { color: chrome.subtitle }]}>
            {formatEchoRelativeAge(entry.createdAt)}
          </Text>
          <Text
            style={[
              styles.body,
              {
                color: isGravity ? chrome.fragmentBodyGravity : chrome.fragmentBodyDrift,
                fontFamily: fonts.regular,
              },
            ]}
            numberOfLines={4}
            ellipsizeMode="tail"
          >
            {entry.text}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

/** Stacked memory fragments — excerpt + temporal whisper, no kind labels. */
export function EchoMemoryVessel({ candidates, chrome, onEntryPress }: EchoMemoryVesselProps) {
  const t = useAppTheme();
  const fragment = useMemo(() => echoFragmentChrome(t, chrome), [t, chrome]);

  if (candidates.length === 0) {
    return null;
  }

  return (
    <View style={styles.stack} testID="echo-memory-vessel">
      {candidates.map((entry) => (
        <EchoMemoryFragment
          key={entry.id}
          entry={entry}
          chrome={chrome}
          fragment={fragment}
          onPress={onEntryPress != null ? () => onEntryPress(entry) : undefined}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    width: '100%',
    gap: 10,
  },
  fragment: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: screenContentInnerPad + 4,
    borderRadius: ECHO_FRAGMENT_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    opacity: 0.55,
  },
  fragmentBody: {
    flex: 1,
    minWidth: 0,
  },
  age: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.1,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.12,
  },
});
