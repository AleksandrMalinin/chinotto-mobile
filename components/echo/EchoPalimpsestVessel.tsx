import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import {
  ECHO_PALIMPSEST_PEEK_DY,
  ECHO_PALIMPSEST_PEEL_COMMIT_MS,
  ECHO_PALIMPSEST_PEEL_DRAG_MAX,
  ECHO_PALIMPSEST_PEEL_FADE_MS,
  ECHO_PALIMPSEST_PEEL_SNAP_DY,
  ECHO_PALIMPSEST_PRESS_IN_MS,
  ECHO_PALIMPSEST_PRESS_OUT_MS,
  ECHO_PALIMPSEST_RIM_COUNT,
  ECHO_PALIMPSEST_VISIBLE,
} from '../../constants/echoLayer';
import { fonts, screenContentInnerPad, useAppTheme } from '../../theme';
import { getHapticsEnabled } from '../../storage/settingsPrefs';
import { advancePalimpsestTopIndex, palimpsestStackIndices } from '../../utils/echoPalimpsestDeck';
import { palimpsestPeelDragOffset } from '../../utils/echoPalimpsestPeel';
import {
  formatEchoTemporalRim,
  formatEchoTemporalWhisper,
} from '../../utils/formatEchoTemporalWhisper';
import { echoPalimpsestRimExcerpt } from '../../utils/echoPalimpsestRim';
import type { EchoCandidate } from '../../utils/selectEchoCandidates';
import type { EchoChromeColors } from './echoChrome';
import { echoAccentForKind, echoFragmentBorderForKind } from './echoChrome';
import { ECHO_FRAGMENT_RADIUS, echoFragmentChrome } from './echoVesselChrome';

export type EchoPalimpsestVesselProps = {
  candidates: readonly EchoCandidate[];
  chrome: EchoChromeColors;
  onEntryPress?: (entry: EchoCandidate) => void;
};

type RimTier = {
  opacity: number;
  scale: number;
  translateY: number;
  marginLeft: number;
  showExcerpt: boolean;
  peelLift: number;
};

/** Nearer rim (last in stack) → excerpt; deeper → age only. */
function rimTierForLayer(layerIndex: number, layerCount: number): RimTier {
  const isNearer = layerIndex === layerCount - 1;
  if (isNearer) {
    return {
      opacity: 0.5,
      scale: 0.97,
      translateY: -4,
      marginLeft: -1,
      showExcerpt: true,
      peelLift: 0.1,
    };
  }
  return {
    opacity: 0.28,
    scale: 0.95,
    translateY: -11,
    marginLeft: 2,
    showExcerpt: false,
    peelLift: 0.06,
  };
}

/**
 * Direction B — submerged traces + one full card; peel rotates the deck.
 */
export function EchoPalimpsestVessel({
  candidates,
  chrome,
  onEntryPress,
}: EchoPalimpsestVesselProps) {
  const t = useAppTheme();
  const fragment = useMemo(() => echoFragmentChrome(t, chrome), [t, chrome]);
  const deck = useMemo(
    () => candidates.slice(0, ECHO_PALIMPSEST_VISIBLE),
    [candidates],
  );
  const deckKey = useMemo(() => deck.map((entry) => entry.id).join('|'), [deck]);
  const [topIndex, setTopIndex] = useState(0);
  const peelY = useRef(new Animated.Value(0)).current;
  const primaryFade = useRef(new Animated.Value(1)).current;
  const pressDim = useRef(new Animated.Value(1)).current;
  const pressSettleY = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    void getHapticsEnabled().then(setHapticsEnabled);
  }, []);

  useEffect(() => {
    setTopIndex(0);
    peelY.stopAnimation();
    peelY.setValue(0);
    primaryFade.setValue(1);
    pressSettleY.setValue(0);
  }, [deckKey, peelY, primaryFade, pressSettleY]);

  const advanceDeck = useCallback(() => {
    setTopIndex((i) => advancePalimpsestTopIndex(i, deck.length));
  }, [deck.length]);

  const commitPeel = useCallback(() => {
    peelY.stopAnimation();
    Animated.sequence([
      Animated.timing(primaryFade, {
        toValue: 0.55,
        duration: Math.floor(ECHO_PALIMPSEST_PEEL_FADE_MS * 0.35),
        useNativeDriver: true,
      }),
      Animated.timing(primaryFade, {
        toValue: 1,
        duration: ECHO_PALIMPSEST_PEEL_FADE_MS,
        useNativeDriver: true,
      }),
    ]).start();
    advanceDeck();
    peelY.setValue(0);
    if (hapticsEnabled) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
    }
  }, [advanceDeck, hapticsEnabled, peelY, primaryFade]);

  const panResponder = useMemo(() => {
    if (reduceMotion || deck.length <= 1) {
      return null;
    }
    const isVerticalPeel = (_: unknown, g: { dx: number; dy: number }) =>
      Math.abs(g.dy) > Math.abs(g.dx) + 4 && g.dy > 6;

    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: isVerticalPeel,
      onMoveShouldSetPanResponder: isVerticalPeel,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) {
          peelY.setValue(palimpsestPeelDragOffset(g.dy));
        }
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy >= ECHO_PALIMPSEST_PEEK_DY) {
          Animated.timing(peelY, {
            toValue: ECHO_PALIMPSEST_PEEL_SNAP_DY,
            duration: ECHO_PALIMPSEST_PEEL_COMMIT_MS,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start(({ finished }) => {
            if (finished) {
              commitPeel();
            }
          });
          return;
        }
        Animated.spring(peelY, {
          toValue: 0,
          useNativeDriver: true,
          friction: 10,
          tension: 65,
        }).start();
      },
    });
  }, [commitPeel, deck.length, peelY, reduceMotion]);

  const primaryScale = peelY.interpolate({
    inputRange: [0, ECHO_PALIMPSEST_PEEL_DRAG_MAX],
    outputRange: [1, 0.98],
    extrapolate: 'clamp',
  });

  if (deck.length === 0) {
    return null;
  }

  const stackIndices = palimpsestStackIndices(deck.length, topIndex);
  const topDeckIdx = stackIndices[stackIndices.length - 1]!;
  const topEntry = deck[topDeckIdx]!;
  const buriedIndices = stackIndices.slice(0, -1);
  const rimIndices = buriedIndices.slice(-ECHO_PALIMPSEST_RIM_COUNT);

  const peelHandlers =
    !reduceMotion && panResponder != null ? panResponder.panHandlers : {};

  const onPressIn = () => {
    Animated.parallel([
      Animated.timing(pressDim, {
        toValue: 0.9,
        duration: ECHO_PALIMPSEST_PRESS_IN_MS,
        useNativeDriver: true,
      }),
      Animated.timing(pressSettleY, {
        toValue: 3,
        duration: ECHO_PALIMPSEST_PRESS_IN_MS,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const onPressOut = () => {
    Animated.parallel([
      Animated.timing(pressDim, {
        toValue: 1,
        duration: ECHO_PALIMPSEST_PRESS_OUT_MS,
        useNativeDriver: true,
      }),
      Animated.timing(pressSettleY, {
        toValue: 0,
        duration: ECHO_PALIMPSEST_PRESS_OUT_MS,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <View style={styles.shell} testID="echo-palimpsest-vessel">
      <Animated.View
        testID="echo-palimpsest-stack"
        style={[styles.stack, { transform: [{ translateY: peelY }] }]}
        {...peelHandlers}
      >
        {rimIndices.map((deckIdx, layerIndex) => {
          const entry = deck[deckIdx]!;
          const accent = echoAccentForKind(chrome, entry.kind);
          const tier = rimTierForLayer(layerIndex, rimIndices.length);
          const rimOpacity = peelY.interpolate({
            inputRange: [0, ECHO_PALIMPSEST_PEEL_DRAG_MAX],
            outputRange: [tier.opacity, Math.min(tier.opacity + tier.peelLift, 0.62)],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={`rim-${entry.id}-${topIndex}`}
              testID={`echo-palimpsest-rim-${entry.id}`}
              style={[
                styles.rimWrap,
                {
                  opacity: rimOpacity,
                  marginBottom: 5,
                  marginLeft: tier.marginLeft,
                  transform: [
                    { translateY: tier.translateY },
                    { scale: tier.scale },
                  ],
                },
              ]}
              pointerEvents="none"
            >
              <View style={styles.rim}>
                <View style={[styles.rimDot, { backgroundColor: accent }]} />
                <View style={styles.rimBody}>
                  <Text
                    style={[styles.rimAge, { color: chrome.subtitle }]}
                    numberOfLines={1}
                  >
                    {formatEchoTemporalRim(entry.createdAt)}
                  </Text>
                  {tier.showExcerpt ? (
                    <Text
                      testID={`echo-palimpsest-rim-excerpt-${entry.id}`}
                      style={[styles.rimExcerpt, { color: chrome.subtitle }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {echoPalimpsestRimExcerpt(entry.text)}
                    </Text>
                  ) : null}
                </View>
              </View>
            </Animated.View>
          );
        })}

        <Pressable
          testID={`echo-palimpsest-primary-${topEntry.id}`}
          accessibilityLabel={topEntry.text}
          accessibilityHint={
            reduceMotion
              ? 'Opens full text. Long press to reveal next memory.'
              : 'Opens full text. Drag down slowly to reveal next memory.'
          }
          onPress={onEntryPress != null ? () => onEntryPress(topEntry) : undefined}
          onLongPress={reduceMotion && deck.length > 1 ? commitPeel : undefined}
          delayLongPress={500}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={styles.topPressable}
          {...(Platform.OS === 'android' ? { android_ripple: null } : {})}
        >
          <Animated.View
            style={{
              opacity: Animated.multiply(primaryFade, pressDim),
              transform: [{ scale: primaryScale }, { translateY: pressSettleY }],
            }}
          >
            <PalimpsestTopCard entry={topEntry} chrome={chrome} fragment={fragment} />
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

type PalimpsestTopCardProps = {
  entry: EchoCandidate;
  chrome: EchoChromeColors;
  fragment: ReturnType<typeof echoFragmentChrome>;
};

function PalimpsestTopCard({ entry, chrome, fragment }: PalimpsestTopCardProps) {
  const isGravity = entry.kind === 'gravity';
  const accent = echoAccentForKind(chrome, entry.kind);
  const borderColor = echoFragmentBorderForKind(chrome, entry.kind);

  return (
    <View
      testID={`echo-palimpsest-layer-${entry.id}`}
      style={[
        styles.card,
        {
          backgroundColor: fragment.fill,
          borderColor,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: accent }]} />
      <View style={styles.cardBody}>
        <Text style={[styles.age, { color: chrome.subtitle }]}>
          {formatEchoTemporalWhisper(entry.createdAt)}
        </Text>
        <Text
          style={[
            styles.body,
            {
              color: isGravity ? chrome.fragmentBodyGravity : chrome.fragmentBodyDrift,
            },
          ]}
        >
          {entry.text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  stack: {
    width: '100%',
    alignItems: 'stretch',
  },
  rimWrap: {
    marginHorizontal: 4,
  },
  rim: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: screenContentInnerPad + 4,
  },
  rimBody: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  rimDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 5,
    opacity: 0.55,
  },
  rimAge: {
    fontFamily: fonts.regular,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.2,
    opacity: 0.4,
  },
  rimExcerpt: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: 0.06,
    opacity: 0.38,
  },
  topPressable: {
    width: '100%',
    marginTop: -6,
    zIndex: 2,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingTop: 22,
    paddingBottom: 18,
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
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  age: {
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.2,
    opacity: 0.5,
    marginBottom: 10,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 18,
    lineHeight: 27,
    letterSpacing: 0.12,
  },
});
