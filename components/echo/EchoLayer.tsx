import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { EchoCandidate } from '../../utils/selectEchoCandidates';
import { echoContentOpacity, echoContentParallaxX } from '../../utils/echoPagerMotion';
import { screenContentGutter, useAppTheme } from '../../theme';
import type { ThoughtSheetOpenAnchor } from '../thoughtSheet/detents';
import { ECHO_PRESENCE_SETTLE_MS } from '../../constants/echoLayer';
import type { EchoUiVariant } from '../../constants/echoUiVariant';
import { ECHO_UI_VARIANT_SHIPPED } from '../../constants/echoUiVariant';
import { EchoFieldVessel } from './EchoFieldVessel';
import { EchoFilamentVessel } from './EchoFilamentVessel';
import { EchoPalimpsestVessel } from './EchoPalimpsestVessel';
import { EchoThresholdVessel } from './EchoThresholdVessel';
import { echoChromeFromTheme } from './echoChrome';

export type EchoLayerProps = {
  candidates: readonly EchoCandidate[];
  onEntryPress?: (entry: EchoCandidate, anchor?: ThoughtSheetOpenAnchor) => void;
  /** Pager scroll — drives delayed content fade + parallax. */
  scrollX?: Animated.Value;
  pageWidth?: number;
  /** Echo UI variant (defaults to shipped palimpsest). */
  uiVariant?: EchoUiVariant;
  /** Dims Echo when recall sheet is open (Echo-origin enter). */
  recallDim?: Animated.Value;
  /** Stream home settled on Echo — soft land before interaction. */
  onEchoPage?: boolean;
};

/** Echo presence — no scroll, no feature explanation copy. */
export function EchoLayer({
  candidates,
  onEntryPress,
  scrollX,
  pageWidth = 0,
  uiVariant = ECHO_UI_VARIANT_SHIPPED,
  recallDim,
  onEchoPage = false,
}: EchoLayerProps) {
  const t = useAppTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const gutter = screenContentGutter(width);
  const chrome = useMemo(() => echoChromeFromTheme(t), [t]);
  const [reduceMotion, setReduceMotion] = useState(false);
  const presenceSettle = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (!onEchoPage) {
      presenceSettle.stopAnimation();
      presenceSettle.setValue(1);
      return;
    }
    if (reduceMotion) {
      presenceSettle.setValue(1);
      return;
    }
    presenceSettle.setValue(0.9);
    Animated.timing(presenceSettle, {
      toValue: 1,
      duration: ECHO_PRESENCE_SETTLE_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [onEchoPage, presenceSettle, reduceMotion]);

  const motionEnabled = scrollX != null && pageWidth > 0 && !reduceMotion;

  const contentOpacity = useMemo(() => {
    if (!motionEnabled || scrollX == null) {
      return undefined;
    }
    return echoContentOpacity(scrollX, pageWidth);
  }, [motionEnabled, pageWidth, scrollX]);

  const contentTranslateX = useMemo(() => {
    if (!motionEnabled || scrollX == null) {
      return undefined;
    }
    return echoContentParallaxX(scrollX, pageWidth);
  }, [motionEnabled, pageWidth, scrollX]);

  const onPrimaryPress = useCallback(
    (entry: EchoCandidate) => {
      onEntryPress?.(entry, undefined);
    },
    [onEntryPress],
  );

  const body = (() => {
    switch (uiVariant) {
      case 'field':
        return (
          <EchoFieldVessel
            candidates={candidates}
            chrome={chrome}
            onEntryPress={onEntryPress != null ? onPrimaryPress : undefined}
          />
        );
      case 'filament':
        return (
          <EchoFilamentVessel
            candidates={candidates}
            chrome={chrome}
            onEntryPress={onEntryPress != null ? onPrimaryPress : undefined}
          />
        );
      case 'palimpsest':
        return (
          <EchoPalimpsestVessel
            candidates={candidates}
            chrome={chrome}
            onEntryPress={onEntryPress != null ? onPrimaryPress : undefined}
          />
        );
      default:
        return (
          <EchoThresholdVessel
            candidates={candidates}
            chrome={chrome}
            onEntryPress={onEntryPress != null ? onPrimaryPress : undefined}
          />
        );
    }
  })();

  const swipeOpacity = contentOpacity ?? 1;
  const presenceOpacity =
    motionEnabled && scrollX != null
      ? Animated.multiply(swipeOpacity, presenceSettle)
      : onEchoPage && !reduceMotion
        ? presenceSettle
        : swipeOpacity;

  const motionBody =
    contentOpacity != null || contentTranslateX != null || (onEchoPage && !reduceMotion) ? (
      <Animated.View
        testID="echo-layer-presence"
        style={{
          flex: 1,
          opacity: presenceOpacity,
          transform: contentTranslateX != null ? [{ translateX: contentTranslateX }] : undefined,
        }}
      >
        {body}
      </Animated.View>
    ) : (
      body
    );

  return (
    <View
      style={[
        styles.shell,
        {
          paddingTop: t.spacing.xl,
          paddingBottom: Math.max(insets.bottom, t.spacing.lg) + t.spacing.xl,
          paddingHorizontal: gutter,
        },
      ]}
      testID="echo-layer"
    >
      {recallDim != null ? (
        <Animated.View style={{ flex: 1, opacity: recallDim }}>{motionBody}</Animated.View>
      ) : (
        motionBody
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
});
