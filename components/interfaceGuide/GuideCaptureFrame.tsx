import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, useWindowDimensions, type ViewStyle } from 'react-native';

import { ChinottoLogo, chinottoLogoLeadingOutset } from '../ChinottoLogo';
import { InterfaceGuideGlyph } from '../InterfaceGuideGlyph';
import { SyncHeaderStatus, type SyncHeaderAuthPhase } from '../SyncHeaderStatus';
import {
  screenContentGutter,
  screenContentInnerPad,
  spacing,
  useAppTheme,
} from '../../theme';
import {
  GUIDE_PREVIEW_SCALE,
  guidePreviewScaledSize,
  resolveGuidePreviewDesignHeight,
  resolveGuidePreviewDesignWidth,
} from './guidePreviewMetrics';

const HEADER_LOGO_SIZE = 42;
const GUIDE_GLYPH_SIZE = 28;
/** Design-space corner radius — scales with preview (≈8px on screen at 0.68). */
const PREVIEW_TOP_RADIUS = 12;
const noop = () => {};

type Props = {
  children?: React.ReactNode;
  composer?: React.ReactNode;
  /** Dim stream behind a sheet overlay (thread / continue slides). */
  dimmed?: boolean;
  overlay?: React.ReactNode;
  /** Header sync chip — guide previews default to signed-out “Enable sync”. */
  syncPhase?: SyncHeaderAuthPhase;
  /** Pulse the Enable sync label (sync slide). */
  enableSyncHighlight?: boolean;
  style?: ViewStyle;
  testID?: string;
};

/**
 * Faithful capture-shell chrome for guide previews — same gutter, header, composer block as live capture,
 * uniformly scaled down so the modal preview breathes.
 */
export function GuideCaptureFrame({
  children,
  composer,
  dimmed = false,
  overlay,
  syncPhase = 'signed_out',
  enableSyncHighlight = false,
  style,
  testID,
}: Props) {
  const t = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const designWidth = resolveGuidePreviewDesignWidth(windowWidth);
  const designHeight = resolveGuidePreviewDesignHeight(designWidth);
  const gutter = screenContentGutter(designWidth);
  const headerLogoAlignStyle = { marginLeft: -chinottoLogoLeadingOutset(HEADER_LOGO_SIZE) };
  const headerGuideAlignStyle = { marginRight: -chinottoLogoLeadingOutset(HEADER_LOGO_SIZE) };
  const scaled = guidePreviewScaledSize(designWidth, designHeight);
  const scaledTopRadius = PREVIEW_TOP_RADIUS * GUIDE_PREVIEW_SCALE;

  const shellBody = (
    <View
      testID={testID ?? 'guide-capture-frame'}
      style={[
        styles.shell,
        {
          width: designWidth,
          height: designHeight,
          backgroundColor: t.colors.bg,
          borderTopLeftRadius: PREVIEW_TOP_RADIUS,
          borderTopRightRadius: PREVIEW_TOP_RADIUS,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: 'rgba(255,255,255,0.06)',
          borderBottomWidth: 0,
        },
        style,
      ]}
      pointerEvents="none"
    >
      <View style={[styles.headerWrap, { paddingHorizontal: gutter, paddingTop: spacing.xs, marginBottom: spacing.sm }]}>
        <View style={styles.headerBar}>
          <View style={styles.headerLogoSlot}>
            <ChinottoLogo
              size={HEADER_LOGO_SIZE}
              color={t.colors.logoMark}
              style={headerLogoAlignStyle}
            />
            <SyncHeaderStatus
              phase={syncPhase}
              enableSyncLabelShimmer={enableSyncHighlight}
              onPress={noop}
              style={styles.syncAfterLogo}
            />
          </View>
          <View style={[styles.guideSlot, headerGuideAlignStyle]}>
            <InterfaceGuideGlyph size={GUIDE_GLYPH_SIZE} color={t.colors.metaFg} />
          </View>
        </View>
      </View>

      {composer != null ? (
        <View style={[styles.composerWrap, { paddingHorizontal: gutter }]}>
          <View style={styles.composerBlock}>{composer}</View>
        </View>
      ) : null}

      <View style={[styles.streamWrap, dimmed ? styles.streamDimmed : null]}>{children}</View>

      {overlay != null ? <View style={styles.overlayHost}>{overlay}</View> : null}
    </View>
  );

  return (
    <View
      style={[
        styles.scaleClip,
        scaled,
        {
          borderTopLeftRadius: scaledTopRadius,
          borderTopRightRadius: scaledTopRadius,
        },
      ]}
      testID="guide-preview-bottom-fade"
    >
      <View
        style={{
          width: designWidth,
          height: designHeight,
          transform: [{ scale: GUIDE_PREVIEW_SCALE }],
          transformOrigin: 'top left',
        }}
      >
        <MaskedView
          style={{ width: designWidth, height: designHeight }}
          maskElement={
            <View style={{ width: designWidth, height: designHeight, backgroundColor: 'transparent' }}>
              <View
                style={{
                  width: designWidth,
                  height: designHeight,
                  borderTopLeftRadius: PREVIEW_TOP_RADIUS,
                  borderTopRightRadius: PREVIEW_TOP_RADIUS,
                  overflow: 'hidden',
                }}
              >
                <LinearGradient
                  colors={['#000000', '#000000', '#000000', 'transparent']}
                  locations={[0, 0.34, 0.5, 1]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              </View>
            </View>
          }
        >
          {shellBody}
        </MaskedView>
      </View>
    </View>
  );
}

export const GUIDE_COMPOSER_MIN_HEIGHT = 92;
export const GUIDE_COMPOSER_MAX_HEIGHT = 120;

const styles = StyleSheet.create({
  scaleClip: {
    alignSelf: 'center',
    overflow: 'hidden',
  },
  shell: {
    overflow: 'hidden',
    position: 'relative',
  },
  headerWrap: {},
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  headerLogoSlot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    minWidth: 0,
  },
  syncAfterLogo: {
    marginLeft: spacing.xs,
    paddingVertical: 6,
    paddingRight: 4,
  },
  guideSlot: {
    width: HEADER_LOGO_SIZE,
    height: HEADER_LOGO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerWrap: {
    zIndex: 2,
  },
  composerBlock: {
    paddingHorizontal: screenContentInnerPad,
    paddingTop: 20,
    paddingBottom: 12,
  },
  streamWrap: {
    flex: 1,
    minHeight: 0,
  },
  streamDimmed: {
    opacity: 0.38,
  },
  overlayHost: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 3,
  },
});
