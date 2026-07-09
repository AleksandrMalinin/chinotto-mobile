import { useMemo, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { ECHO_VESSEL_OPTICAL_LIFT_PT } from '../../constants/echoLayer';
import { fonts, useAppTheme } from '../../theme';
import { streamPreviewFirstLine } from '../../utils/streamPreviewFirstLine';
import type { EchoCandidate } from '../../utils/selectEchoCandidates';
import type { EchoChromeColors } from './echoChrome';
import { echoFragmentBorderForKind } from './echoChrome';
import { ECHO_FRAGMENT_RADIUS, echoDepthFragmentChrome, echoFragmentChrome } from './echoVesselChrome';

const MAX_PREVIEW = 220;

function truncatePreview(text: string): string {
  const first = streamPreviewFirstLine(text);
  if (first.length <= MAX_PREVIEW) {
    return first;
  }
  return `${first.slice(0, MAX_PREVIEW).trimEnd()}…`;
}

function threadHint(count?: number): string | null {
  if (count == null || count <= 0) {
    return null;
  }
  return `Part of a thread with ${count} related thought${count === 1 ? '' : 's'}`;
}

export type EchoRecallCardVesselProps = {
  candidate: EchoCandidate;
  chrome: EchoChromeColors;
  onEntryPress?: (entry: EchoCandidate) => void;
  onDismiss?: () => void;
  fixedShell?: boolean;
  layout?: 'page' | 'depth';
};

/** Echo recall — aligned with desktop MemoryEcho: meta above, one calm card body. */
export function EchoRecallCardVessel({
  candidate,
  chrome,
  onEntryPress,
  onDismiss,
  fixedShell = false,
  layout = 'page',
}: EchoRecallCardVesselProps) {
  const t = useAppTheme();
  const isDepth = layout === 'depth';
  const fragment = useMemo(
    () =>
      isDepth
        ? echoDepthFragmentChrome(t, chrome, candidate.kind)
        : echoFragmentChrome(t, chrome),
    [candidate.kind, chrome, isDepth, t],
  );
  const preview = truncatePreview(candidate.text);
  const reason = candidate.reason ?? 'From earlier';
  const thread = threadHint(candidate.trailNeighborCount);
  const borderColor = echoFragmentBorderForKind(chrome, candidate.kind);

  return (
    <View
      style={[
        styles.shell,
        fixedShell ? styles.shellFixed : null,
        isDepth ? styles.shellDepth : null,
      ]}
      testID="echo-recall-card"
      accessibilityLabel="Memory from earlier"
    >
      {!isDepth ? (
        <View style={styles.horizon} accessibilityElementsHidden importantForAccessibility="no">
          <LinearGradient
            colors={['transparent', chrome.metaMuted, 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            locations={[0, 0.5, 1]}
            style={styles.horizonLine}
          />
        </View>
      ) : null}

      <View style={[styles.metaRow, isDepth ? styles.metaRowDepth : null]}>
        <Text
          style={[
            styles.metaReason,
            { color: chrome.metaMuted },
            isDepth ? styles.metaReasonDepth : null,
          ]}
        >
          {reason}
        </Text>
        {thread != null ? (
          <Text style={[styles.metaThread, { color: isDepth ? chrome.threadAccent : chrome.subtitle }]}>
            <Text style={{ color: chrome.metaMuted }}> · </Text>
            {thread}
          </Text>
        ) : null}
      </View>

      <View style={styles.cardWrap}>
        <EchoRecallBody
          preview={preview}
          fragment={fragment}
          borderColor={borderColor}
          chrome={chrome}
          isDepth={isDepth}
          onPress={() => onEntryPress?.(candidate)}
        />
        {onDismiss ? (
          <Pressable
            testID="echo-recall-dismiss"
            accessibilityRole="button"
            accessibilityLabel="Dismiss memory"
            onPress={onDismiss}
            hitSlop={12}
            style={({ pressed }) => [
              styles.dismissBtn,
              { opacity: pressed ? 0.55 : 0.85 },
            ]}
          >
            <Text style={[styles.dismiss, { color: chrome.metaMuted }]}>×</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

type BodyProps = {
  preview: string;
  fragment: ReturnType<typeof echoFragmentChrome>;
  borderColor: string;
  chrome: EchoChromeColors;
  isDepth: boolean;
  onPress: () => void;
};

function EchoRecallBody({ preview, fragment, borderColor, chrome, isDepth, onPress }: BodyProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${preview}. Resume this thought`}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      {...(Platform.OS === 'android' ? { android_ripple: null } : {})}
      style={[
        styles.body,
        isDepth ? styles.bodyDepth : null,
        {
          backgroundColor: pressed ? fragment.pressed : fragment.fill,
          borderColor: pressed ? borderColor : fragment.border,
          borderWidth: isDepth ? 1 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <Text
        style={[
          styles.bodyText,
          { color: chrome.fragmentBody },
          isDepth ? styles.bodyTextDepth : null,
        ]}
      >
        {preview}
      </Text>
      <Text style={[styles.cta, { color: isDepth ? chrome.threadAccent : chrome.metaMuted }]}>
        Resume
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 8 + ECHO_VESSEL_OPTICAL_LIFT_PT,
  },
  shellFixed: {
    justifyContent: 'center',
    paddingTop: 0,
    paddingBottom: 12,
  },
  shellDepth: {
    flex: 0,
    justifyContent: 'flex-start',
    paddingTop: 0,
    paddingBottom: 0,
  },
  horizon: {
    height: 28,
    justifyContent: 'center',
    marginBottom: 12,
  },
  horizonLine: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
    opacity: 0.45,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  metaRowDepth: {
    marginBottom: 8,
    paddingHorizontal: 0,
  },
  metaReason: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.55,
    textTransform: 'uppercase',
  },
  metaReasonDepth: {
    opacity: 0.92,
  },
  metaThread: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.15,
  },
  cardWrap: {
    position: 'relative',
  },
  dismissBtn: {
    position: 'absolute',
    top: 4,
    right: 2,
    zIndex: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dismiss: {
    fontFamily: fonts.regular,
    fontSize: 22,
    lineHeight: 24,
  },
  body: {
    borderRadius: ECHO_FRAGMENT_RADIUS,
    paddingTop: 14,
    paddingBottom: 12,
    paddingLeft: 14,
    paddingRight: 40,
  },
  bodyDepth: {
    paddingTop: 15,
    paddingBottom: 13,
  },
  bodyText: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.12,
    marginBottom: 10,
  },
  bodyTextDepth: {
    fontSize: 16.5,
    lineHeight: 24,
    letterSpacing: 0.14,
  },
  cta: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.2,
  },
});
