import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  type ColorValue,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Rect } from 'react-native-svg';

import { useAppTheme } from '../theme';

const VIEW = 32;
const COLOR_CYCLE_MS = 14000;

type Props = {
  size?: number;
  color?: ColorValue;
};

/**
 * Guide affordance — three stacked cards; slow breathe + thin violet↔cyan wash.
 */
export function InterfaceGuideGlyph({ size = 28, color }: Props) {
  const t = useAppTheme();
  const stroke = color ?? t.colors.metaFg;
  const fill = t.colors.accentSubtle;
  const [reduceMotion, setReduceMotion] = useState(false);
  const breathe = useRef(new Animated.Value(1)).current;
  const colorPhase = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      breathe.setValue(1);
      colorPhase.setValue(0);
      return;
    }

    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 0.97,
          duration: 5200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 1,
          duration: 5200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    const colorLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(colorPhase, {
          toValue: 1,
          duration: COLOR_CYCLE_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(colorPhase, {
          toValue: 0,
          duration: COLOR_CYCLE_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    breatheLoop.start();
    colorLoop.start();
    return () => {
      breatheLoop.stop();
      colorLoop.stop();
    };
  }, [breathe, colorPhase, reduceMotion]);

  const violetWash = colorPhase.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.2, 0.05, 0.2],
  });
  const cyanWash = colorPhase.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.04, 0.22, 0.04],
  });
  const frontVioletStroke = colorPhase.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.72, 0.2, 0.72],
  });
  const frontCyanStroke = colorPhase.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.18, 0.85, 0.18],
  });

  return (
    <Animated.View
      style={[styles.shell, { width: size, height: size, transform: [{ scale: breathe }] }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={[styles.colorWash, { opacity: violetWash }]}>
        <LinearGradient
          colors={['rgba(100, 118, 185, 0.55)', 'rgba(100, 118, 185, 0)']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
      <Animated.View style={[styles.colorWash, { opacity: cyanWash }]}>
        <LinearGradient
          colors={['rgba(34, 200, 220, 0)', 'rgba(34, 200, 220, 0.42)']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
      <Svg width={size} height={size} viewBox={`0 0 ${VIEW} ${VIEW}`}>
        <Rect
          x={5}
          y={4}
          width={18}
          height={14}
          rx={3}
          fill={fill}
          stroke={stroke}
          strokeWidth={0.9}
          opacity={0.38}
        />
        <Rect
          x={7}
          y={7}
          width={18}
          height={14}
          rx={3}
          fill={fill}
          stroke={stroke}
          strokeWidth={0.9}
          opacity={0.58}
        />
        <AnimatedRect
          x={9}
          y={10}
          width={18}
          height={14}
          rx={3}
          fill={fill}
          stroke="rgba(138, 148, 200, 0.9)"
          strokeWidth={1.1}
          opacity={frontVioletStroke}
        />
        <AnimatedRect
          x={9}
          y={10}
          width={18}
          height={14}
          rx={3}
          fill="none"
          stroke="rgba(34, 200, 220, 0.75)"
          strokeWidth={1.05}
          opacity={frontCyanStroke}
        />
        <Rect x={12} y={13.5} width={10} height={1.1} rx={0.55} fill={stroke} opacity={0.45} />
        <Rect x={12} y={16.5} width={7} height={1.1} rx={0.55} fill={stroke} opacity={0.32} />
      </Svg>
    </Animated.View>
  );
}

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const styles = StyleSheet.create({
  shell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorWash: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
    overflow: 'hidden',
  },
});
