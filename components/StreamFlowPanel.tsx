import { useEffect, useId, useRef, useState } from 'react';
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

const DRAW_EASING = Easing.bezier(0.22, 1, 0.36, 1);

const BLOB_VIOLET = { bg: 'rgba(124, 58, 237, 0.34)', halfMs: 26000, delayStartMs: 0 };
const BLOB_CYAN = { bg: 'rgba(6, 182, 212, 0.28)', halfMs: 19000, delayStartMs: 4000 };
const BLOB_EMBER = { bg: 'rgba(249, 115, 22, 0.22)', halfMs: 24000, delayStartMs: 9000 };

const AnimatedPath = Animated.createAnimatedComponent(Path);

export type StreamFlowPanelProps = {
  /** No drift / path draw — final state (reduce motion). */
  calm?: boolean;
  /** Paths hidden + blobs static until cleared (not used on welcome). */
  deferMotion?: boolean;
  /** One-shot SVG opacity pulse (desktop typing accent). */
  typingAccent?: boolean;
};

export function StreamFlowPanel({ calm = false, deferMotion = false, typingAccent = false }: StreamFlowPanelProps) {
  const { width: windowWidth } = useWindowDimensions();
  const panelW = Math.min(260, windowWidth * 0.88);
  const panelH = (panelW * 13) / 11;

  const padT = panelH * 0.14;
  const padH = panelW * 0.12;
  const padB = panelH * 0.16;
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

    Animated.parallel([
      mk(offA, DUR_A_MS, DELAY_A_MS),
      mk(offB, DUR_B_MS, DELAY_B_MS),
      mk(offC, DUR_C_MS, DELAY_C_MS),
    ]).start();

    return undefined;
  }, [effectiveCalm, deferMotion, offA, offB, offC]);

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

  return (
    <View
      style={[styles.panel, { width: panelW, height: panelH }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <BlobField
        panelW={panelW}
        panelH={panelH}
        calm={effectiveCalm}
        deferMotion={deferMotion}
      />

      <LinearGradient
        colors={['rgba(18,18,28,0.55)', 'rgba(12,14,22,0.35)', 'rgba(20,22,34,0.5)']}
        locations={[0, 0.48, 1]}
        start={{ x: 0.35, y: 0 }}
        end={{ x: 0.65, y: 1 }}
        style={[styles.glass, StyleSheet.absoluteFillObject]}
      />

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

  return (
    <View
      style={[styles.blobField, { width: bfW, height: bfH, left: -panelW * 0.12, top: -panelH * 0.12 }]}
      pointerEvents="none"
    >
      <DriftBlob
        style={{
          width: bfW * 0.55,
          height: bfH * 0.48,
          left: bfW * -0.05,
          top: bfH * 0.08,
          backgroundColor: BLOB_VIOLET.bg,
        }}
        halfMs={BLOB_VIOLET.halfMs}
        delayStartMs={BLOB_VIOLET.delayStartMs}
        driftX={driftX}
        driftY={driftY}
        enabled={!calm && !deferMotion}
      />
      <DriftBlob
        style={{
          width: bfW * 0.52,
          height: bfH * 0.52,
          right: bfW * -0.08,
          top: bfH * 0.28,
          backgroundColor: BLOB_CYAN.bg,
        }}
        halfMs={BLOB_CYAN.halfMs}
        delayStartMs={BLOB_CYAN.delayStartMs}
        driftX={driftX}
        driftY={driftY}
        enabled={!calm && !deferMotion}
      />
      <DriftBlob
        style={{
          width: bfW * 0.48,
          height: bfH * 0.44,
          left: bfW * 0.18,
          bottom: bfH * -0.06,
          backgroundColor: BLOB_EMBER.bg,
        }}
        halfMs={BLOB_EMBER.halfMs}
        delayStartMs={BLOB_EMBER.delayStartMs}
        driftX={driftX}
        driftY={driftY}
        enabled={!calm && !deferMotion}
      />
    </View>
  );
}

type DriftBlobProps = {
  style: ViewStyle;
  halfMs: number;
  delayStartMs: number;
  driftX: number;
  driftY: number;
  enabled: boolean;
};

function DriftBlob({ style, halfMs, delayStartMs, driftX, driftY, enabled }: DriftBlobProps) {
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
          opacity: 0.85,
          transform: [{ translateX }, { translateY }, { scale }],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'relative',
    borderRadius: 22,
    overflow: 'hidden',
    alignSelf: 'center',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.45)',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.55,
        shadowRadius: 48,
      },
      android: { elevation: 12 },
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
    borderRadius: 9999,
  },
  glass: {
    zIndex: 1,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(100,110,180,0.2)',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 40,
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
