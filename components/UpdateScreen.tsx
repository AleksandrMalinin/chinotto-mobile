import MaskedView from '@react-native-masked-view/masked-view';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmbientBackground } from './AmbientBackground';
import { ChinottoLogo, chinottoLogoLeadingOutset } from './ChinottoLogo';
import { StreamFlowPanel } from './StreamFlowPanel';
import {
  chinottoHeadlineTextGradient,
  fonts,
  screenContentGutter,
  spacing,
  typography,
  useAppTheme,
} from '../theme';

export type UpdateScreenProps = {
  visible: boolean;
  mode: 'soft' | 'forced';
  title: string;
  message: string;
  storeUrl: string | null;
  onUpdatePress: () => void;
  onLaterPress?: () => void;
};

export type UpdateScreenContentProps = Omit<UpdateScreenProps, 'visible'>;

/**
 * Extra `paddingBottom` on the flex middle band — shifts the vertically centered lines + copy stack
 * upward (footer is taller than the brand row, so pure `center` reads low).
 */
const CENTER_CONTENT_BIAS_UP_PCT = 0.11;

/** Line block height — hero treatment; keep three strokes inside clip via {@link LINES_FIT_SCALE}. */
const LINES_BAND_HEIGHT_PCT = 0.44;
/** Scale panel into the slot; higher = larger, more visible line art. */
const LINES_FIT_SCALE = 0.9;
const BRAND_LOGO_SIZE = 30;

/** Same clip-to-glyphs treatment as empty-stream welcome title (`RecentList` / `chinottoHeadlineTextGradient`). */
function UpdateScreenTitle({
  text,
  mode,
  reduceMotion,
  flatColor,
}: {
  text: string;
  mode: 'soft' | 'forced';
  reduceMotion: boolean;
  flatColor: string;
}) {
  const g = chinottoHeadlineTextGradient;
  const baseStyle = [styles.title, { fontFamily: fonts.medium }];
  const useGradient = mode === 'soft' && !reduceMotion;

  if (!useGradient) {
    return (
      <Text style={[...baseStyle, { color: flatColor }]} accessibilityRole="header">
        {text}
      </Text>
    );
  }

  return (
    <View accessible accessibilityRole="header" accessibilityLabel={text}>
      <MaskedView
        style={{ alignSelf: 'center' }}
        maskElement={
          <Text style={[...baseStyle, { color: '#000000' }]} accessibilityElementsHidden>
            {text}
          </Text>
        }
      >
        <LinearGradient colors={[...g.colors]} locations={[...g.locations]} start={g.start} end={g.end}>
          <Text style={[...baseStyle, { opacity: 0 }]} importantForAccessibility="no">
            {text}
          </Text>
        </LinearGradient>
      </MaskedView>
    </View>
  );
}

/**
 * Full-screen update state: brand, static line art, headline + copy, text-only primary action.
 */
export function UpdateScreenContent({
  mode,
  title,
  message,
  storeUrl: _storeUrl,
  onUpdatePress,
  onLaterPress,
}: UpdateScreenContentProps) {
  const t = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const gutter = screenContentGutter(windowWidth);
  const [reduceMotion, setReduceMotion] = useState(false);

  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    contentOpacity.setValue(0);
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [contentOpacity, mode, title, message]);

  const handleUpdate = useCallback(() => {
    void AccessibilityInfo.announceForAccessibility?.('Opening app store');
    onUpdatePress();
  }, [onUpdatePress]);

  const handleLater = useCallback(() => {
    onLaterPress?.();
  }, [onLaterPress]);

  const linesBandHeight = Math.round(windowHeight * LINES_BAND_HEIGHT_PCT);
  const topPad = insets.top + spacing.md;
  const centerBandPadBottom = Math.round(windowHeight * CENTER_CONTENT_BIAS_UP_PCT);

  return (
    <View style={[styles.root, { backgroundColor: t.colors.bg }]} testID="update-screen-root">
      <AmbientBackground fixedChrome />

      {/* Slight global hush — not a card, just less punch than raw shell */}
      <View style={styles.contrastVeil} pointerEvents="none" />

      <Animated.View
        style={[
          styles.foreground,
          { paddingHorizontal: gutter, paddingTop: topPad, opacity: contentOpacity },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.brandBlock}>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <ChinottoLogo
              size={BRAND_LOGO_SIZE}
              color={t.colors.fgDim}
              animated={false}
              style={{ marginLeft: -chinottoLogoLeadingOutset(BRAND_LOGO_SIZE) }}
            />
          </View>
          <Text
            accessible={false}
            importantForAccessibility="no"
            style={[styles.wordmark, typography.meta, { color: t.colors.fgDim }]}
            testID="update-screen-wordmark"
          >
            Chinotto
          </Text>
        </View>

        {/* Lines + headline: centered in the band between brand and footer, biased slightly up */}
        <View style={[styles.centerBand, { paddingBottom: centerBandPadBottom }]} pointerEvents="box-none">
          <View style={styles.illustrationCopyGroup}>
            <View style={[styles.linesSlot, { height: linesBandHeight }]} pointerEvents="none">
              <View style={styles.linesBandCenter}>
                <View style={styles.linesFit}>
                  <StreamFlowPanel
                    linesOnly
                    updateBackdrop={mode}
                    calm
                    deferMotion={false}
                    useAdaptiveChrome={false}
                  />
                </View>
              </View>
            </View>

            <View style={styles.copyBlock}>
              <UpdateScreenTitle
                text={title}
                mode={mode}
                reduceMotion={reduceMotion}
                flatColor={t.colors.fg}
              />
              <Text
                style={[styles.subtitle, { color: t.colors.fgDim, fontFamily: fonts.regular }]}
                numberOfLines={2}
              >
                {message}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + spacing.xs }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Update"
            onPress={handleUpdate}
            hitSlop={{ top: 14, bottom: 14, left: 20, right: 20 }}
            style={({ pressed }) => [styles.updateCta, { opacity: pressed ? 0.82 : 1 }]}
          >
            <Text style={[styles.updateCtaLabel, { fontFamily: fonts.medium }]}>Update</Text>
          </Pressable>

          {mode === 'soft' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Later"
              onPress={handleLater}
              hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}
              style={({ pressed }) => [styles.laterWrap, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={[styles.laterLabel, { color: t.colors.metaFg, fontFamily: fonts.regular }]}>
                Later
              </Text>
            </Pressable>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

/**
 * Blocks the app when {@link UpdateScreenProps.mode} is `forced`; soft mode allows dismissing via `onLaterPress`.
 */
export function UpdateScreen({
  visible,
  mode,
  title,
  message,
  storeUrl,
  onUpdatePress,
  onLaterPress,
}: UpdateScreenProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      transparent={false}
      onRequestClose={mode === 'soft' ? () => onLaterPress?.() : () => {}}
    >
      <UpdateScreenContent
        key={visible ? `${mode}-${title}` : 'hidden'}
        mode={mode}
        title={title}
        message={message}
        storeUrl={storeUrl}
        onUpdatePress={onUpdatePress}
        onLaterPress={onLaterPress}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  contrastVeil: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.07)',
  },
  foreground: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  /** Fills space between top brand and bottom actions; centers line art + copy (see `CENTER_CONTENT_BIAS_UP_PCT`). */
  centerBand: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationCopyGroup: {
    width: '100%',
    alignItems: 'center',
  },
  /** Thinnest in-app rhythm: {@link typography.meta} (Regular 13) + wide tracking. */
  wordmark: {
    letterSpacing: 0.62,
  },
  linesSlot: {
    width: '100%',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  linesBandCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  /** Whole `StreamFlowPanel` scales down so three strokes fit inside the crop band */
  linesFit: {
    transform: [{ scale: LINES_FIT_SCALE }, { translateY: -2 }],
  },
  copyBlock: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 340,
    paddingHorizontal: spacing.xs,
  },
  title: {
    fontSize: 25,
    lineHeight: 32,
    letterSpacing: -0.42,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.12,
    textAlign: 'center',
    maxWidth: 300,
    alignSelf: 'center',
  },
  footer: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    paddingTop: spacing.sm,
    gap: 6,
  },
  updateCta: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  updateCtaLabel: {
    fontSize: 17,
    letterSpacing: 0.35,
    color: 'rgba(248, 248, 252, 0.94)',
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(150, 165, 255, 0.38)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 12,
      },
      default: {},
    }),
  },
  laterWrap: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginTop: -2,
  },
  laterLabel: {
    fontSize: 15,
    letterSpacing: 0.2,
  },
});
