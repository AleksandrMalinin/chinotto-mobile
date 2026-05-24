import { useCallback, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { EchoCandidate } from '../../utils/selectEchoCandidates';
import {
  fonts,
  screenContentGutter,
  screenContentInnerPad,
  useAppTheme,
} from '../../theme';
import type { ThoughtSheetOpenAnchor } from '../thoughtSheet/detents';
import { EchoMemoryVessel } from './EchoMemoryVessel';
import { echoChromeFromTheme } from './echoChrome';

export type EchoLayerProps = {
  candidates: readonly EchoCandidate[];
  onEntryPress?: (entry: EchoCandidate, anchor?: ThoughtSheetOpenAnchor) => void;
};

const ECHO_HEADLINE = {
  kicker: 'Echo',
  caption: 'Thoughts that resurfaced over time.',
} as const;

export function EchoLayer({ candidates, onEntryPress }: EchoLayerProps) {
  const t = useAppTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const gutter = screenContentGutter(width);
  const chrome = useMemo(() => echoChromeFromTheme(t), [t]);
  const headline = ECHO_HEADLINE;

  const onRowPress = useCallback(
    (entry: EchoCandidate) => {
      onEntryPress?.(entry, undefined);
    },
    [onEntryPress],
  );

  return (
    <View style={styles.shell} testID="echo-layer">
      <ScrollView
        testID="echo-layer-scroll"
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: t.spacing.lg,
            paddingBottom: Math.max(insets.bottom, t.spacing.lg) + t.spacing.xl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.whisperBlock, { paddingHorizontal: gutter + screenContentInnerPad }]}>
          <Text
            testID="echo-layer-kicker"
            style={[styles.kicker, { color: chrome.headline }]}
          >
            {headline.kicker}
          </Text>
          <Text
            testID="echo-layer-caption"
            style={[styles.caption, { color: chrome.subtitle }]}
          >
            {headline.caption}
          </Text>
        </View>

        <View style={{ paddingHorizontal: gutter }}>
          <EchoMemoryVessel
            candidates={candidates}
            chrome={chrome}
            onEntryPress={onEntryPress != null ? onRowPress : undefined}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
  },
  whisperBlock: {
    marginBottom: 28,
  },
  kicker: {
    fontFamily: fonts.medium,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  caption: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
    fontStyle: 'italic',
  },
});
