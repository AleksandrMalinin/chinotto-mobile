import { useMemo } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { useAppTheme } from '../theme';
import type { EchoCandidate } from '../utils/selectEchoCandidates';
import { EchoRecallCardVessel } from './echo/EchoRecallCardVessel';
import { echoChromeFromTheme } from './echo/echoChrome';
import type { ThoughtSheetOpenAnchor } from './thoughtSheet/detents';

export type HomeDepthRecallProps = {
  candidate: EchoCandidate;
  recallDim?: Animated.Value;
  onEntryPress?: (entry: EchoCandidate, anchor?: ThoughtSheetOpenAnchor) => void;
  onDismiss?: () => void;
};

/** Desktop-style memory echo — one slot under composer on stream home. */
export function HomeDepthRecall({
  candidate,
  recallDim,
  onEntryPress,
  onDismiss,
}: HomeDepthRecallProps) {
  const t = useAppTheme();
  const chrome = useMemo(() => echoChromeFromTheme(t), [t]);
  const card = (
    <EchoRecallCardVessel
      candidate={candidate}
      chrome={chrome}
      onEntryPress={onEntryPress}
      onDismiss={onDismiss}
      layout="depth"
    />
  );

  if (recallDim != null) {
    return (
      <Animated.View style={[styles.slot, { opacity: recallDim }]} testID="home-depth-recall">
        {card}
      </Animated.View>
    );
  }

  return (
    <View style={styles.slot} testID="home-depth-recall">
      {card}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    marginTop: 2,
    marginBottom: 10,
  },
});
