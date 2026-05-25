import { useCallback, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { fonts, screenContentInnerPad, useAppTheme } from '../../theme';
import { buildEchoFilamentStations } from '../../utils/echoFilament';
import type { EchoCandidate } from '../../utils/selectEchoCandidates';
import { formatEchoRelativeAge } from '../../utils/formatEchoRelativeAge';
import type { EchoChromeColors } from './echoChrome';
import { echoAccentForKind, echoFragmentBorderForKind } from './echoChrome';
import { ECHO_FRAGMENT_RADIUS, echoFragmentChrome } from './echoVesselChrome';

export type EchoFilamentVesselProps = {
  candidates: readonly EchoCandidate[];
  chrome: EchoChromeColors;
  onEntryPress?: (entry: EchoCandidate) => void;
};

const SCRUB_THRESHOLD_PX = 28;

/**
 * Direction C — continuity thread: slow horizontal scrub moves between stations.
 */
export function EchoFilamentVessel({
  candidates,
  chrome,
  onEntryPress,
}: EchoFilamentVesselProps) {
  const t = useAppTheme();
  const fragment = useMemo(() => echoFragmentChrome(t, chrome), [t, chrome]);
  const stations = useMemo(() => buildEchoFilamentStations(candidates), [candidates]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const scrubOriginX = useRef(0);
  const activeIndexRef = useRef(0);

  activeIndexRef.current = activeIndex;

  const clampIndex = useCallback(
    (index: number) => Math.max(0, Math.min(stations.length - 1, index)),
    [stations.length],
  );

  const panResponder = useMemo(() => {
    if (stations.length <= 1) {
      return null;
    }
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > Math.abs(g.dy) + 4,
      onPanResponderGrant: (evt) => {
        scrubOriginX.current = evt.nativeEvent.locationX;
      },
      onPanResponderMove: (evt, g) => {
        if (trackWidth <= 0) {
          return;
        }
        const x = scrubOriginX.current + g.dx;
        const slot = trackWidth / stations.length;
        const idx = clampIndex(Math.floor(x / slot));
        if (idx !== activeIndexRef.current) {
          setActiveIndex(idx);
        }
      },
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dx) < SCRUB_THRESHOLD_PX) {
          return;
        }
        const dir = g.dx > 0 ? 1 : -1;
        setActiveIndex((i) => clampIndex(i + dir));
      },
    });
  }, [clampIndex, stations.length, trackWidth]);

  const onTrackLayout = useCallback((e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  }, []);

  if (stations.length === 0) {
    return null;
  }

  const active = stations[activeIndex] ?? stations[0]!;
  const isGravity = active.kind === 'gravity';
  const accent = echoAccentForKind(chrome, active.kind);
  const borderColor = echoFragmentBorderForKind(chrome, active.kind);

  return (
    <View style={styles.shell} testID="echo-filament-vessel">
      <Pressable
        testID={`echo-filament-station-${active.id}`}
        accessibilityLabel={active.text}
        accessibilityHint="Opens full text."
        onPress={onEntryPress != null ? () => onEntryPress(active) : undefined}
        style={styles.stationPressable}
        {...(Platform.OS === 'android' ? { android_ripple: null } : {})}
      >
        <View
          style={[
            styles.stationCard,
            { backgroundColor: fragment.fill, borderColor },
          ]}
        >
          <View style={[styles.dot, { backgroundColor: accent }]} />
          <View style={styles.stationBody}>
            <Text style={[styles.age, { color: chrome.subtitle }]}>
              {formatEchoRelativeAge(active.createdAt)}
            </Text>
            <Text
              style={[
                styles.body,
                {
                  color: isGravity
                    ? chrome.fragmentBodyGravity
                    : chrome.fragmentBodyDrift,
                },
              ]}
            >
              {active.text}
            </Text>
          </View>
        </View>
      </Pressable>

      <View
        testID="echo-filament-track"
        style={styles.trackWrap}
        onLayout={onTrackLayout}
        {...(panResponder?.panHandlers ?? {})}
        accessibilityLabel="Continuity thread"
        accessibilityHint="Swipe horizontally to move along the thread."
        accessibilityRole="adjustable"
        accessibilityValue={{
          min: 1,
          max: stations.length,
          now: activeIndex + 1,
        }}
      >
        <View style={[styles.threadLine, { backgroundColor: chrome.subtitle }]} />
        <View style={styles.dotsRow}>
          {stations.map((station, i) => {
            const isActive = i === activeIndex;
            const dotAccent = echoAccentForKind(chrome, station.kind);
            return (
              <Pressable
                key={station.id}
                testID={`echo-filament-dot-${station.id}`}
                onPress={() => setActiveIndex(i)}
                style={styles.dotHit}
                hitSlop={12}
              >
                <View
                  style={[
                    styles.threadDot,
                    {
                      backgroundColor: dotAccent,
                      opacity: isActive ? 0.9 : 0.35,
                      transform: [{ scale: isActive ? 1.2 : 1 }],
                    },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
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
  stationPressable: {
    width: '100%',
    marginBottom: 32,
  },
  stationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 20,
    paddingHorizontal: screenContentInnerPad + 4,
    borderRadius: ECHO_FRAGMENT_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    opacity: 0.55,
  },
  stationBody: {
    flex: 1,
    minWidth: 0,
  },
  age: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 18,
    lineHeight: 27,
    letterSpacing: 0.12,
  },
  trackWrap: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  threadLine: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: 28,
    height: StyleSheet.hairlineWidth,
    opacity: 0.22,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    minHeight: 48,
  },
  dotHit: {
    padding: 8,
  },
  threadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
