import { StyleSheet, View, type ViewStyle } from 'react-native';

import { ChinottoLogo, chinottoLogoLeadingOutset } from '../ChinottoLogo';
import { InterfaceGuideGlyph } from '../InterfaceGuideGlyph';
import { radius, screenContentInnerPad, spacing, useAppTheme } from '../../theme';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  guideGlyphSize?: number;
};

/** Miniature capture shell — same header + bg as the live screen. */
export function GuideMobileChrome({ children, style, guideGlyphSize = 28 }: Props) {
  const t = useAppTheme();
  const logoSize = 30;
  const logoAlignStyle = { marginLeft: -chinottoLogoLeadingOutset(logoSize) };
  const guideAlignStyle = { marginRight: -chinottoLogoLeadingOutset(logoSize) };

  return (
    <View
      style={[
        styles.shell,
        {
          backgroundColor: t.colors.bg,
          borderColor: t.colors.border,
          borderRadius: radius.lg,
        },
        style,
      ]}
      pointerEvents="none"
    >
      <View style={[styles.headerBar, { paddingHorizontal: spacing.sm }]}>
        <ChinottoLogo size={logoSize} color={t.colors.logoMark} style={logoAlignStyle} />
        <View style={styles.headerSpacer} />
        <View style={[styles.guideSlot, guideAlignStyle]}>
          <InterfaceGuideGlyph size={guideGlyphSize} color={t.colors.metaFg} />
        </View>
      </View>
      <View style={[styles.body, { paddingHorizontal: screenContentInnerPad }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    flex: 1,
    minHeight: 300,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  headerSpacer: {
    flex: 1,
  },
  guideSlot: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    paddingTop: 6,
    paddingBottom: spacing.sm,
    gap: 8,
  },
});
