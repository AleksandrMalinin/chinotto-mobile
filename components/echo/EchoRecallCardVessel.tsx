import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { ECHO_VESSEL_OPTICAL_LIFT_PT } from '../../constants/echoLayer';
import { fonts, screenContentInnerPad, useAppTheme } from '../../theme';
import { echoEmotionalIntensityFromText } from '../../utils/echoEmotionalAtmosphere';
import { formatEchoRelativeAge } from '../../utils/formatEchoRelativeAge';
import type { EchoCandidate } from '../../utils/selectEchoCandidates';
import type { EchoChromeColors } from './echoChrome';
import { echoAccentForKind } from './echoChrome';
import { ECHO_FRAGMENT_RADIUS, echoFragmentChrome } from './echoVesselChrome';

const MAX_BODY_CHARS = 380;

function echoPresenceBody(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_BODY_CHARS) {
    return trimmed;
  }
  return `${trimmed.slice(0, MAX_BODY_CHARS).trimEnd()}…`;
}

export type EchoRecallCardVesselProps = {
  candidate: EchoCandidate;
  chrome: EchoChromeColors;
  onEntryPress?: (entry: EchoCandidate) => void;
  onDismiss?: () => void;
};

/**
 * Echo recall — one primary fragment with submerged traces.
 * Centered presence with readable body mass; not a lone stream row in a gradient void.
 */
export function EchoRecallCardVessel({
  candidate,
  chrome,
  onEntryPress,
  onDismiss,
}: EchoRecallCardVesselProps) {
  const t = useAppTheme();
  const fragment = useMemo(() => echoFragmentChrome(t, chrome), [t, chrome]);
  const body = echoPresenceBody(candidate.text);
  const age = formatEchoRelativeAge(candidate.createdAt);
  const accent = echoAccentForKind(chrome, candidate.kind);
  const ghosts = candidate.ghostTraces ?? [];
  const ghostOpacity = 0.34 + echoEmotionalIntensityFromText(candidate.text) * 0.14;

  return (
    <View style={styles.shell} testID="echo-recall-card">
      <View
        style={[styles.horizon, { borderBottomColor: accent }]}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <EchoRecallFragment
        candidate={candidate}
        body={body}
        age={age}
        accent={accent}
        fragment={fragment}
        chrome={chrome}
        onEntryPress={onEntryPress}
        onDismiss={onDismiss}
      />
      {ghosts.length > 0 ? (
        <View
          style={[styles.ghostBlock, { opacity: ghostOpacity }]}
          testID="echo-recall-ghosts"
        >
          {ghosts.map((line, index) => (
            <Text
              key={`${candidate.id}-ghost-${index}`}
              style={[styles.ghostLine, { color: chrome.subtitle }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {line}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

type FragmentProps = {
  candidate: EchoCandidate;
  body: string;
  age: string;
  accent: string;
  fragment: ReturnType<typeof echoFragmentChrome>;
  chrome: EchoChromeColors;
  onEntryPress?: (entry: EchoCandidate) => void;
  onDismiss?: () => void;
};

function EchoRecallFragment({
  candidate,
  body,
  age,
  accent,
  fragment,
  chrome,
  onEntryPress,
  onDismiss,
}: FragmentProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <View
      style={[
        styles.fragment,
        {
          backgroundColor: pressed ? fragment.pressed : fragment.fill,
          borderColor: fragment.border,
        },
      ]}
    >
      <View style={styles.fragmentHeader}>
        <View style={[styles.dot, { backgroundColor: accent }]} />
        <View style={styles.metaBlock}>
          <Text style={[styles.reason, { color: chrome.headline }]}>
            {candidate.reason ?? 'From earlier'}
          </Text>
          {age ? (
            <Text style={[styles.age, { color: chrome.subtitle }]}>{age}</Text>
          ) : null}
        </View>
        {onDismiss ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss memory"
            onPress={onDismiss}
            hitSlop={10}
            style={({ pressed: dismissPressed }) => [
              styles.dismissBtn,
              { opacity: dismissPressed ? 0.55 : 0.75 },
            ]}
          >
            <Text style={[styles.dismiss, { color: chrome.metaMuted }]}>×</Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${body}. Resume this thought`}
        onPress={() => onEntryPress?.(candidate)}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        {...(Platform.OS === 'android' ? { android_ripple: null } : {})}
        style={styles.bodyPress}
      >
        <Text
          style={[
            styles.bodyText,
            {
              color: chrome.fragmentBody,
              fontFamily: fonts.regular,
            },
          ]}
        >
          {body}
        </Text>
        <Text
          style={[
            styles.continueLink,
            {
              color: accent,
              fontFamily: fonts.medium,
            },
          ]}
        >
            Resume
          </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 8 + ECHO_VESSEL_OPTICAL_LIFT_PT,
  },
  horizon: {
    alignSelf: 'center',
    width: '42%',
    maxWidth: 160,
    borderBottomWidth: StyleSheet.hairlineWidth,
    opacity: 0.28,
    marginBottom: 28,
  },
  fragment: {
    borderRadius: ECHO_FRAGMENT_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 20,
    paddingHorizontal: screenContentInnerPad + 4,
  },
  fragmentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    opacity: 0.55,
  },
  metaBlock: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  reason: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.12,
  },
  age: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.1,
    fontStyle: 'italic',
  },
  dismissBtn: {
    marginTop: -2,
    marginRight: -2,
  },
  dismiss: {
    fontFamily: fonts.regular,
    fontSize: 22,
    lineHeight: 24,
  },
  bodyPress: {
    gap: 14,
  },
  bodyText: {
    fontSize: 18,
    lineHeight: 27,
    letterSpacing: 0.15,
  },
  continueLink: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.15,
  },
  ghostBlock: {
    marginTop: 32,
    paddingHorizontal: screenContentInnerPad + 8,
    gap: 16,
  },
  ghostLine: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.12,
    fontStyle: 'italic',
  },
});
