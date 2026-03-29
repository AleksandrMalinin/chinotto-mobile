import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

/** Matches `chinotto-app/src/components/ChinottoLogo.tsx` + `index.css` `.chinotto-logo-animated` timings. */
const VIEWBOX = 64;
const OUTER_R = 22;
/** Outer ring center in viewBox units — symmetric; ring left edge is `RING_CX - OUTER_R`. */
const RING_CX = 32;
const STROKE_LEN = 2 * Math.PI * OUTER_R;

/**
 * Horizontal distance from the component’s left edge to the **drawn** outer ring’s left edge
 * (viewBox padding before the stroke). Use **`marginLeft: -chinottoLogoLeadingOutset(size)`** when
 * the logo sits in a column aligned to body text so the ring lines up with the copy.
 */
export function chinottoLogoLeadingOutset(size: number): number {
  return (size * (RING_CX - OUTER_R)) / VIEWBOX;
}

const STROKE_MS = 1700;
const DOT_MS = 550;
const DOT_DELAYS_MS = [1700, 1950, 2200, 2450] as const;
const BREATHE_DELAY_MS = 3200;
const BREATHE_CYCLE_MS = 5000;

const DOTS = [
  { cx: 32, cy: 23, r: 5 },
  { cx: 24, cy: 34, r: 4 },
  { cx: 40, cy: 34, r: 4 },
  { cx: 32, cy: 41, r: 3 },
] as const;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type ChinottoLogoProps = {
  size?: number;
  /** Ring stroke width in user units (default matches desktop; splash PNG uses 2.5). */
  strokeWidth?: number;
  /** Ring + dots; desktop header uses `--fg-dim`; intro / splash uses near-white */
  color?: ColorValue;
  /** Stroke draw, staggered dots, subtle breathe — same beats as web intro */
  animated?: boolean;
  /** When true, skip intro motion (matches accessibility reduce-motion) */
  reduceMotion?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

export function ChinottoLogo({
  size = 64,
  strokeWidth = 2,
  color = 'rgba(255, 255, 255, 0.92)',
  animated = false,
  reduceMotion: reduceMotionProp,
  testID,
  style,
}: ChinottoLogoProps) {
  const [reduceMotionSys, setReduceMotionSys] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotionSys);
  }, []);

  const reduceMotion = reduceMotionProp ?? reduceMotionSys;

  const dashOffset = useRef(new Animated.Value(animated && !reduceMotion ? STROKE_LEN : 0)).current;
  const dotOpacities = useRef(
    DOTS.map((_, i) => new Animated.Value(animated && !reduceMotion ? 0 : 1))
  ).current;
  const breathe = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!animated) {
      return;
    }
    if (reduceMotion) {
      dashOffset.setValue(0);
      DOTS.forEach((_, i) => dotOpacities[i]!.setValue(1));
      breathe.setValue(1);
      return;
    }

    dashOffset.setValue(STROKE_LEN);
    DOTS.forEach((_, i) => dotOpacities[i]!.setValue(0));
    breathe.setValue(1);

    Animated.timing(dashOffset, {
      toValue: 0,
      duration: STROKE_MS,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();

    DOTS.forEach((_, i) => {
      Animated.timing(dotOpacities[i]!, {
        toValue: 1,
        duration: DOT_MS,
        delay: DOT_DELAYS_MS[i],
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    });

    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 0.97,
          duration: BREATHE_CYCLE_MS / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 1,
          duration: BREATHE_CYCLE_MS / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const t = setTimeout(() => {
      breatheLoop.start();
    }, BREATHE_DELAY_MS);

    return () => {
      clearTimeout(t);
      breatheLoop.stop();
    };
  }, [animated, reduceMotion, breathe, dashOffset, dotOpacities]);

  const strokeDasharray = useMemo(() => `${STROKE_LEN} ${STROKE_LEN}`, []);

  return (
    <Animated.View testID={testID} style={[{ width: size, height: size }, style]} accessibilityRole="image">
      <Animated.View style={{ opacity: breathe, width: size, height: size }}>
        <Svg width={size} height={size} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
          <AnimatedCircle
            cx={32}
            cy={32}
            r={OUTER_R}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
          {DOTS.map((d, i) => (
            <AnimatedCircle
              key={`${d.cx}-${d.cy}-${d.r}`}
              cx={d.cx}
              cy={d.cy}
              r={d.r}
              fill={color}
              opacity={dotOpacities[i]}
            />
          ))}
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}
