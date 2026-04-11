import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';

import { getTheme, useAppTheme } from '../theme';
import { IntroRadialBlobView, type IntroBlobProfile } from './introRadialBlob';

/**
 * Port of `chinotto-app` `StreamFlowPanel` + `stream-flow-*` CSS.
 * @see chinotto-app/docs/stream-flow-panel-animation.md
 */
const VIEW_W = 220;
const VIEW_H = 260;

const PATH_A = { d: 'M 36 44 C 92 52 118 96 78 138 C 58 162 48 188 62 214', len: 420, sw: 1.35, op: 1 };
const PATH_B = { d: 'M 154 36 C 128 78 168 112 148 156 C 132 192 156 222 178 236', len: 360, sw: 1.1, op: 0.45 };
const PATH_C = { d: 'M 24 168 Q 108 148 124 208 T 196 228', len: 280, sw: 0.9, op: 0.32 };

const DELAY_A_MS = 400;
const DELAY_B_MS = 650;
const DELAY_C_MS = 850;
const DUR_A_MS = 2800;
const DUR_B_MS = 2500;
const DUR_C_MS = 2200;

/** Empty stream (`linesOnly`): slower, staged draw so first visits read clearly. */
const LINES_ONLY_DELAY_A_MS = 900;
const LINES_ONLY_DELAY_B_MS = 1500;
const LINES_ONLY_DELAY_C_MS = 2100;
const LINES_ONLY_DUR_A_MS = 6000;
const LINES_ONLY_DUR_B_MS = 5400;
const LINES_ONLY_DUR_C_MS = 5000;

/** Latest finish time for staged `linesOnly` stroke draw (parallel paths). Used for first-launch sync shimmer timing. */
export const LINES_ONLY_MOTION_END_MS = Math.max(
  LINES_ONLY_DELAY_A_MS + LINES_ONLY_DUR_A_MS,
  LINES_ONLY_DELAY_B_MS + LINES_ONLY_DUR_B_MS,
  LINES_ONLY_DELAY_C_MS + LINES_ONLY_DUR_C_MS
);

const DRAW_EASING = Easing.bezier(0.22, 1, 0.36, 1);

/** Drift timings — same roles as before; fills are `IntroRadialBlobView` (desktop intro blobs). */
const BLOB_DRIFT: Record<IntroBlobProfile, { halfMs: number; delayStartMs: number }> = {
  violet: { halfMs: 26000, delayStartMs: 0 },
  cyan: { halfMs: 19000, delayStartMs: 4000 },
  orange: { halfMs: 24000, delayStartMs: 9000 },
};

const AnimatedPath = Animated.createAnimatedComponent(Path);

export type StreamFlowPanelProps = {
  /** No drift / path draw — final state (reduce motion). */
  calm?: boolean;
  /** Paths hidden + blobs static until cleared. */
  deferMotion?: boolean;
  /** One-shot SVG opacity pulse (desktop typing accent). */
  typingAccent?: boolean;
  /**
   * When false, use standard dark chrome only. Avoids adaptive sunlight tint on a surface that
   * shares the capture stream illustration but is not the main shell.
   */
  useAdaptiveChrome?: boolean;
  /**
   * Only animated stroke paths — no glass card, blobs, or outer auras. For empty capture stream.
   */
  linesOnly?: boolean;
};

export function StreamFlowPanel({
  calm = false,
  deferMotion = false,
  typingAccent = false,
  useAdaptiveChrome = true,
  linesOnly = false,
}: StreamFlowPanelProps) {
  const adaptive = useAppTheme();
  const fixed = useMemo(() => getTheme(), []);
  const { sunlightMode } = useAdaptiveChrome ? adaptive : fixed;
  const { width: windowWidth } = useWindowDimensions();
  const panelW = linesOnly ? Math.min(windowWidth * 0.82, 318) : Math.min(260, windowWidth * 0.88);
  const panelH = linesOnly ? (panelW * 15) / 11 : (panelW * 13) / 11;

  const padT = linesOnly ? panelH * 0.065 : panelH * 0.14;
  const padH = linesOnly ? panelW * 0.04 : panelW * 0.12;
  const padB = linesOnly ? panelH * 0.095 : panelH * 0.16;
  const svgW = panelW - 2 * padH;
  const svgH = panelH - padT - padB;

  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  const effectiveCalm = calm || reduceMotion;
  const gradId = `sf-${useId().replace(/:/g, '')}`;

  const offA = useRef(new Animated.Value(effectiveCalm ? 0 : PATH_A.len)).current;
  const offB = useRef(new Animated.Value(effectiveCalm ? 0 : PATH_B.len)).current;
  const offC = useRef(new Animated.Value(effectiveCalm ? 0 : PATH_C.len)).current;

  const svgPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (effectiveCalm) {
      offA.setValue(0);
      offB.setValue(0);
      offC.setValue(0);
      return;
    }
    if (deferMotion) {
      offA.setValue(PATH_A.len);
      offB.setValue(PATH_B.len);
      offC.setValue(PATH_C.len);
      return;
    }

    offA.setValue(PATH_A.len);
    offB.setValue(PATH_B.len);
    offC.setValue(PATH_C.len);

    const mk = (v: Animated.Value, dur: number, delay: number) =>
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, {
          toValue: 0,
          duration: dur,
          easing: DRAW_EASING,
          useNativeDriver: false,
        }),
      ]);

    const slowLines = linesOnly;
    const dA = slowLines ? LINES_ONLY_DUR_A_MS : DUR_A_MS;
    const dB = slowLines ? LINES_ONLY_DUR_B_MS : DUR_B_MS;
    const dC = slowLines ? LINES_ONLY_DUR_C_MS : DUR_C_MS;
    const delA = slowLines ? LINES_ONLY_DELAY_A_MS : DELAY_A_MS;
    const delB = slowLines ? LINES_ONLY_DELAY_B_MS : DELAY_B_MS;
    const delC = slowLines ? LINES_ONLY_DELAY_C_MS : DELAY_C_MS;

    Animated.parallel([mk(offA, dA, delA), mk(offB, dB, delB), mk(offC, dC, delC)]).start();

    return undefined;
  }, [effectiveCalm, deferMotion, linesOnly, offA, offB, offC]);

  useEffect(() => {
    if (!typingAccent) {
      return;
    }
    svgPulse.setValue(1);
    Animated.sequence([
      Animated.timing(svgPulse, {
        toValue: 0.92,
        duration: 225,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(svgPulse, {
        toValue: 1,
        duration: 225,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [typingAccent, svgPulse]);

  const panelShadowStyle = useMemo((): ViewStyle => {
    if (sunlightMode) {
      return Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.35,
          shadowRadius: 4,
        },
        android: { elevation: 3 },
        default: {},
      }) ?? {};
    }
    return Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.45)',
        shadowOffset: { width: 0, height: 19 },
        shadowOpacity: 0.4,
        shadowRadius: 38,
      },
      android: { elevation: 12 },
      default: {},
    }) ?? {};
  }, [sunlightMode]);

  const auraVioletStyle = useMemo(
    (): ViewStyle[] => [
      styles.auraViolet,
      sunlightMode
        ? (Platform.select({
            ios: { shadowColor: 'transparent', shadowOpacity: 0, shadowRadius: 0 },
            default: {},
          }) ?? {})
        : {},
    ],
    [sunlightMode]
  );

  const auraBlueStyle = useMemo(
    (): ViewStyle[] => [
      styles.auraBlue,
      sunlightMode
        ? (Platform.select({
            ios: { shadowColor: 'transparent', shadowOpacity: 0, shadowRadius: 0 },
            default: {},
          }) ?? {})
        : {},
    ],
    [sunlightMode]
  );

  const glassColors = sunlightMode
    ? (['#2c2e3e', '#282a38', '#2a2c3c'] as const)
    : (['rgba(18,18,28,0.55)', 'rgba(12,14,22,0.35)', 'rgba(20,22,34,0.5)'] as const);

  const glassBorder = sunlightMode ? 'rgba(140, 152, 210, 0.32)' : 'rgba(255,255,255,0.06)';

  const glassShadowStyle = useMemo((): ViewStyle => {
    if (sunlightMode) {
      return {};
    }
    return Platform.select({
      ios: {
        shadowColor: '#646eb4',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.14,
        shadowRadius: 26,
      },
      android: {},
      default: {},
    }) ?? {};
  }, [sunlightMode]);

  const lineArt = (
    <View style={[styles.svgPad, { paddingTop: padT, paddingHorizontal: padH, paddingBottom: padB }]}>
      <Animated.View style={{ width: svgW, height: svgH, opacity: svgPulse }}>
        <Svg width={svgW} height={svgH} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMid meet">
          <Defs>
            <SvgLinearGradient
              id={gradId}
              x1="8"
              y1="12"
              x2="212"
              y2="248"
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor="rgb(180,188,255)" stopOpacity={0.9} />
              <Stop offset="0.42" stopColor="rgb(34,200,220)" stopOpacity={0.55} />
              <Stop offset="1" stopColor="rgb(255,150,90)" stopOpacity={0.5} />
            </SvgLinearGradient>
          </Defs>
          <AnimatedPath
            d={PATH_A.d}
            stroke={`url(#${gradId})`}
            strokeWidth={PATH_A.sw}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${PATH_A.len} ${PATH_A.len}`}
            strokeDashoffset={offA}
          />
          <AnimatedPath
            d={PATH_B.d}
            stroke={`url(#${gradId})`}
            strokeWidth={PATH_B.sw}
            strokeLinecap="round"
            fill="none"
            opacity={PATH_B.op}
            strokeDasharray={`${PATH_B.len} ${PATH_B.len}`}
            strokeDashoffset={offB}
          />
          <AnimatedPath
            d={PATH_C.d}
            stroke={`url(#${gradId})`}
            strokeWidth={PATH_C.sw}
            strokeLinecap="round"
            fill="none"
            opacity={PATH_C.op}
            strokeDasharray={`${PATH_C.len} ${PATH_C.len}`}
            strokeDashoffset={offC}
          />
        </Svg>
      </Animated.View>
    </View>
  );

  if (linesOnly) {
    return (
      <View
        style={[styles.panelLinesOnly, { width: panelW, height: panelH }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {lineArt}
      </View>
    );
  }

  return (
    <View
      style={[styles.panel, panelShadowStyle, { width: panelW, height: panelH }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View pointerEvents="none" style={auraVioletStyle} />
      <View pointerEvents="none" style={auraBlueStyle} />

      <BlobField
        panelW={panelW}
        panelH={panelH}
        calm={effectiveCalm}
        deferMotion={deferMotion}
      />

      <LinearGradient
        colors={[...glassColors]}
        locations={[0, 0.48, 1]}
        start={{ x: 0.35, y: 0 }}
        end={{ x: 0.65, y: 1 }}
        style={[styles.glass, glassShadowStyle, { borderColor: glassBorder }, StyleSheet.absoluteFillObject]}
      />

      {lineArt}
    </View>
  );
}

type BlobFieldProps = {
  panelW: number;
  panelH: number;
  calm: boolean;
  deferMotion: boolean;
};

function BlobField({ panelW, panelH, calm, deferMotion }: BlobFieldProps) {
  const bfW = panelW * 1.24;
  const bfH = panelH * 1.24;
  const driftX = bfW * 0.06;
  const driftY = bfH * 0.05;
  const idPrefix = useId().replace(/:/g, '');

  const vmax = Math.max(bfW, bfH);
  const sViolet = vmax * 0.72;
  const sCyan = vmax * 0.68;
  const sOrange = vmax * 0.65;
  const anchorY = bfH * 0.46;
  const violetLeft = bfW * 0.42 - sViolet / 2;
  const violetTop = anchorY - sViolet * 0.44;
  const cyanLeft = bfW * 0.5 - sCyan / 2;
  const cyanTop = anchorY - sCyan * 0.58;
  const orangeLeft = bfW * 0.54 - sOrange / 2;
  const orangeTop = anchorY + sOrange * 0.06;

  const enabled = !calm && !deferMotion;

  return (
    <View
      style={[styles.blobField, { width: bfW, height: bfH, left: -panelW * 0.12, top: -panelH * 0.12 }]}
      pointerEvents="none"
    >
      <DriftRadialBlob
        size={sOrange}
        profile="orange"
        gradientId={`${idPrefix}-o`}
        style={{ left: orangeLeft, top: orangeTop }}
        halfMs={BLOB_DRIFT.orange.halfMs}
        delayStartMs={BLOB_DRIFT.orange.delayStartMs}
        driftX={driftX}
        driftY={driftY}
        enabled={enabled}
      />
      <DriftRadialBlob
        size={sCyan}
        profile="cyan"
        gradientId={`${idPrefix}-c`}
        style={{ left: cyanLeft, top: cyanTop }}
        halfMs={BLOB_DRIFT.cyan.halfMs}
        delayStartMs={BLOB_DRIFT.cyan.delayStartMs}
        driftX={driftX}
        driftY={driftY}
        enabled={enabled}
      />
      <DriftRadialBlob
        size={sViolet}
        profile="violet"
        gradientId={`${idPrefix}-v`}
        style={{ left: violetLeft, top: violetTop }}
        halfMs={BLOB_DRIFT.violet.halfMs}
        delayStartMs={BLOB_DRIFT.violet.delayStartMs}
        driftX={driftX}
        driftY={driftY}
        enabled={enabled}
      />
    </View>
  );
}

type DriftRadialBlobProps = {
  size: number;
  profile: IntroBlobProfile;
  gradientId: string;
  style: Pick<ViewStyle, 'left' | 'top' | 'right' | 'bottom'>;
  halfMs: number;
  delayStartMs: number;
  driftX: number;
  driftY: number;
  enabled: boolean;
};

function DriftRadialBlob({
  size,
  profile,
  gradientId,
  style,
  halfMs,
  delayStartMs,
  driftX,
  driftY,
  enabled,
}: DriftRadialBlobProps) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!enabled) {
      t.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, {
          toValue: 1,
          duration: halfMs,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(t, {
          toValue: 0,
          duration: halfMs,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    const id = setTimeout(() => {
      loop.start();
    }, delayStartMs);
    return () => {
      clearTimeout(id);
      loop.stop();
    };
  }, [enabled, halfMs, delayStartMs, t]);

  const translateX = t.interpolate({
    inputRange: [0, 1],
    outputRange: [0, driftX],
  });
  const translateY = t.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -driftY],
  });
  const scale = t.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });

  return (
    <Animated.View
      style={[
        styles.blob,
        style,
        {
          width: size,
          height: size,
          opacity: 0.92,
          transform: [{ translateX }, { translateY }, { scale }],
        },
      ]}
    >
      <IntroRadialBlobView size={size} profile={profile} gradientId={gradientId} vivid />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panelLinesOnly: {
    position: 'relative',
    alignSelf: 'center',
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  panel: {
    position: 'relative',
    borderRadius: 22,
    overflow: 'hidden',
    alignSelf: 'center',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.45)',
        shadowOffset: { width: 0, height: 19 },
        shadowOpacity: 0.4,
        shadowRadius: 38,
      },
      android: { elevation: 12 },
      default: {},
    }),
  },
  auraViolet: {
    position: 'absolute',
    top: -7,
    right: -7,
    bottom: -7,
    left: -7,
    borderRadius: 29,
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#646eb4',
        shadowOpacity: 0.14,
        shadowRadius: 26,
        shadowOffset: { width: 0, height: 0 },
      },
      android: {},
      default: {},
    }),
  },
  auraBlue: {
    position: 'absolute',
    top: -16,
    right: -16,
    bottom: -16,
    left: -16,
    borderRadius: 38,
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#4664b4',
        shadowOpacity: 0.085,
        shadowRadius: 44,
        shadowOffset: { width: 0, height: 0 },
      },
      android: {},
      default: {},
    }),
  },
  blobField: {
    position: 'absolute',
    zIndex: 0,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
  },
  glass: {
    zIndex: 1,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
    ...Platform.select({
      ios: {
        shadowColor: '#646eb4',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.14,
        shadowRadius: 26,
      },
      android: {},
      default: {},
    }),
  },
  svgPad: {
    zIndex: 2,
    flex: 1,
  },
});
