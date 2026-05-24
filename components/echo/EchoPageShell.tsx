import { StyleSheet, View } from 'react-native';

import type { EchoCandidate } from '../../utils/selectEchoCandidates';
import type { ThoughtSheetOpenAnchor } from '../thoughtSheet/detents';
import { EchoLayer } from './EchoLayer';

export type EchoPageShellProps = {
  candidates: readonly EchoCandidate[];
  onEntryPress?: (entry: EchoCandidate, anchor?: ThoughtSheetOpenAnchor) => void;
};

/** Echo content page — shell background crossfades at CaptureScreen level. */
export function EchoPageShell({ candidates, onEntryPress }: EchoPageShellProps) {
  return (
    <View style={styles.shell} testID="echo-page-shell">
      <EchoLayer candidates={candidates} onEntryPress={onEntryPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    position: 'relative',
  },
});
