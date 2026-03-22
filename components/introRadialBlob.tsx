import { View, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

/**
 * Desktop intro blob RGBA bases + soft radial falloff (RN substitute for blur + screen).
 * Used by `StreamFlowPanel`; `vivid` boosts stops for the panel only.
 */
export type IntroBlobProfile = 'violet' | 'cyan' | 'orange';

const RGB: Record<IntroBlobProfile, { r: number; g: number; b: number }> = {
  violet: { r: 124, g: 58, b: 237 },
  cyan: { r: 6, g: 182, b: 212 },
  orange: { r: 249, g: 115, b: 22 },
};

const cap = (a: number) => Math.min(1, a);

function radialStops(rgb: string, profile: IntroBlobProfile, vivid: boolean) {
  /** Panel-only: stronger mist so blobs read clearly under glass (not the glass itself). */
  const v = vivid ? 1.62 : 1;
  switch (profile) {
    case 'violet':
      return [
        <Stop key="0" offset="0%" stopColor={rgb} stopOpacity={cap(0.22 * v)} />,
        <Stop key="1" offset="22%" stopColor={rgb} stopOpacity={cap(0.14 * v)} />,
        <Stop key="2" offset="48%" stopColor={rgb} stopOpacity={cap(0.085 * v)} />,
        <Stop key="3" offset="72%" stopColor={rgb} stopOpacity={cap(0.035 * v)} />,
        <Stop key="4" offset="100%" stopColor={rgb} stopOpacity={0} />,
      ];
    case 'cyan':
      return [
        <Stop key="0" offset="0%" stopColor={rgb} stopOpacity={cap(0.17 * v)} />,
        <Stop key="1" offset="28%" stopColor={rgb} stopOpacity={cap(0.1 * v)} />,
        <Stop key="2" offset="55%" stopColor={rgb} stopOpacity={cap(0.045 * v)} />,
        <Stop key="3" offset="80%" stopColor={rgb} stopOpacity={cap(0.012 * v)} />,
        <Stop key="4" offset="100%" stopColor={rgb} stopOpacity={0} />,
      ];
    case 'orange':
      return [
        <Stop key="0" offset="0%" stopColor={rgb} stopOpacity={cap(0.14 * v)} />,
        <Stop key="1" offset="30%" stopColor={rgb} stopOpacity={cap(0.075 * v)} />,
        <Stop key="2" offset="58%" stopColor={rgb} stopOpacity={cap(0.032 * v)} />,
        <Stop key="3" offset="85%" stopColor={rgb} stopOpacity={cap(0.008 * v)} />,
        <Stop key="4" offset="100%" stopColor={rgb} stopOpacity={0} />,
      ];
  }
}

export type IntroRadialBlobViewProps = {
  size: number;
  profile: IntroBlobProfile;
  gradientId: string;
  style?: ViewStyle;
  /** Stronger radial stops — `StreamFlowPanel` blobs only (does not change glass / stroke). */
  vivid?: boolean;
};

/** Static radial “mist” blob (no drift — wrap in `Animated.View` if needed). */
export function IntroRadialBlobView({ size, profile, gradientId, style, vivid = false }: IntroRadialBlobViewProps) {
  const { r, g, b } = RGB[profile];
  const rgb = `rgb(${r},${g},${b})`;
  const half = size / 2;

  return (
    <View
      testID="intro-radial-blob"
      style={[{ width: size, height: size }, style]}
      pointerEvents="none"
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={gradientId} cx="50%" cy="50%" r="50%" fx="48%" fy="46%">
            {radialStops(rgb, profile, vivid)}
          </RadialGradient>
        </Defs>
        <Circle cx={half} cy={half} r={half} fill={`url(#${gradientId})`} />
      </Svg>
    </View>
  );
}
