import { Animated, StyleSheet, View } from 'react-native';

import type { EchoUiVariant } from '../../constants/echoUiVariant';
import type { EchoCandidate } from '../../utils/selectEchoCandidates';
import type { ThoughtSheetOpenAnchor } from '../thoughtSheet/detents';
import { EchoLayer } from './EchoLayer';

export type EchoPageShellProps = {
  candidates: readonly EchoCandidate[];
  onEntryPress?: (entry: EchoCandidate, anchor?: ThoughtSheetOpenAnchor) => void;
  scrollX?: Animated.Value;
  pageWidth?: number;
  uiVariant?: EchoUiVariant;
  recallDim?: Animated.Value;
  onEchoPage?: boolean;
};

/** Echo content page — shell background crossfades at CaptureScreen level. */
export function EchoPageShell({
  candidates,
  onEntryPress,
  scrollX,
  pageWidth,
  uiVariant,
  recallDim,
  onEchoPage,
}: EchoPageShellProps) {
  return (
    <View style={styles.shell} testID="echo-page-shell">
      <EchoLayer
        candidates={candidates}
        onEntryPress={onEntryPress}
        scrollX={scrollX}
        pageWidth={pageWidth}
        uiVariant={uiVariant}
        recallDim={recallDim}
        onEchoPage={onEchoPage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    position: 'relative',
  },
});
