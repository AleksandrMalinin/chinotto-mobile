import { Fragment, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { EchoCandidate } from '../../utils/selectEchoCandidates';
import { fonts, screenContentInnerPad, useAppTheme } from '../../theme';
import { formatEchoRelativeAge } from '../../utils/formatEchoRelativeAge';
import type { EchoChromeColors } from './echoChrome';
import { echoAccentForKind } from './echoChrome';
import { ECHO_VESSEL_RADIUS, echoVesselChrome } from './echoVesselChrome';

export type EchoMemoryVesselProps = {
  candidates: readonly EchoCandidate[];
  chrome: EchoChromeColors;
  onEntryPress?: (entry: EchoCandidate) => void;
};

type EchoMemoryRowProps = {
  entry: EchoCandidate;
  chrome: EchoChromeColors;
  rowPressedFill: string;
  separatorColor: string;
  isLast: boolean;
  onPress?: () => void;
};

function EchoMemoryRow({
  entry,
  chrome,
  rowPressedFill,
  separatorColor,
  isLast,
  onPress,
}: EchoMemoryRowProps) {
  const [pressed, setPressed] = useState(false);
  const isGravity = entry.kind === 'gravity';
  const accent = echoAccentForKind(chrome, entry.kind);

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
        style={[
          styles.row,
          !isLast && styles.rowWithDivider,
          !isLast && { borderBottomColor: separatorColor },
          pressed && { backgroundColor: rowPressedFill },
        ]}
      >
        <View style={[styles.dot, { backgroundColor: accent }]} />
        <View style={styles.rowBody}>
          <Text style={[styles.age, { color: chrome.metaMuted }]}>
            {formatEchoRelativeAge(entry.createdAt)}
          </Text>
          <Text
            style={[
              styles.body,
              {
                color: isGravity ? chrome.fragmentBodyGravity : chrome.fragmentBodyDrift,
                fontFamily: isGravity ? fonts.medium : fonts.regular,
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

/** One inset-grouped memory register — editorial rows, not repeated glass tiles. */
export function EchoMemoryVessel({ candidates, chrome, onEntryPress }: EchoMemoryVesselProps) {
  const t = useAppTheme();
  const vessel = useMemo(() => echoVesselChrome(t, chrome), [t, chrome]);

  if (candidates.length === 0) {
    return null;
  }

  return (
    <View style={[styles.outer, vessel.shadow]} testID="echo-memory-vessel">
      <View style={[styles.shell, { backgroundColor: vessel.fill }]}>
        {candidates.map((entry, index) => (
          <Fragment key={entry.id}>
            <EchoMemoryRow
              entry={entry}
              chrome={chrome}
              rowPressedFill={vessel.rowPressed}
              separatorColor={vessel.separator}
              isLast={index === candidates.length - 1}
              onPress={onEntryPress != null ? () => onEntryPress(entry) : undefined}
            />
          </Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: '100%',
    borderRadius: ECHO_VESSEL_RADIUS,
  },
  shell: {
    borderRadius: ECHO_VESSEL_RADIUS,
    overflow: 'hidden',
    position: 'relative',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: screenContentInnerPad + 4,
    gap: 12,
  },
  rowWithDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    opacity: 0.72,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  age: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.15,
    marginBottom: 7,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.12,
  },
});
