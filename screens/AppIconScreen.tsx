import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { ChinottoLogo, chinottoLogoLeadingOutset } from '../components/ChinottoLogo';
import {
  APP_ICON_VARIANTS,
  getAppIconVariant,
  type AppIconVariantId,
} from '../src/services/icons/iconVariants';
import { fonts, screenContentGutter, useAppTheme } from '../theme';

type AppIconScreenProps = {
  selectedId: AppIconVariantId;
  supportsDynamicIcons: boolean;
  onSelect: (id: AppIconVariantId) => void;
  onClose: () => void;
};

export function AppIconScreen({
  selectedId,
  supportsDynamicIcons,
  onSelect,
  onClose,
}: AppIconScreenProps) {
  const t = useAppTheme();
  const headerLogoSize = 42;
  const gutter = screenContentGutter(0);
  const headerLogoAlignStyle = {
    marginLeft: -chinottoLogoLeadingOutset(headerLogoSize),
  };
  const selected = getAppIconVariant(selectedId);

  return (
    <View testID="app-icon-screen" style={[styles.container, { backgroundColor: t.colors.bg }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'right', 'left']}>
        <View
          style={[
            styles.headerBar,
            {
              paddingHorizontal: gutter,
              paddingTop: t.spacing.xs,
              marginBottom: t.spacing.sm,
            },
          ]}
        >
          <View style={styles.headerLogoSlot}>
            <Pressable
              testID="app-icon-logo"
              accessibilityRole="button"
              accessibilityLabel="Chinotto"
              accessibilityHint="Back to settings"
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
            >
              <ChinottoLogo size={headerLogoSize} color={t.colors.fgDim} style={headerLogoAlignStyle} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: gutter,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { color: t.colors.fg }]}>App Icon</Text>
          <Text style={[styles.subtitle, { color: t.colors.metaFg }]}>
            Alternate expressions of the same Chinotto mark.
          </Text>

          <View style={styles.grid}>
            {APP_ICON_VARIANTS.map((variant) => {
              const isSelected = selectedId === variant.id;
              const iconTileStyle = {
                backgroundColor: variant.iosBackground,
                borderColor: isSelected ? t.colors.borderFocus : t.colors.border,
              };
              return (
                <Pressable
                  key={variant.id}
                  testID={`app-icon-option-${variant.id}`}
                  onPress={() => onSelect(variant.id)}
                  style={({ pressed }) => [
                    styles.tileWrap,
                    {
                      opacity: pressed ? 0.93 : 1,
                    },
                  ]}
                >
                  <View style={[styles.tile, iconTileStyle]}>
                    {variant.gradientStops ? (
                      <LinearGradient
                        colors={variant.gradientStops}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                    ) : null}
                    <ChinottoLogo size={42} color={variant.foreground} />
                    {isSelected ? (
                      <View style={[styles.badge, { backgroundColor: t.colors.bg }]}>
                        <Text style={[styles.badgeText, { color: t.colors.fg }]}>✓</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.tileLabel, { color: isSelected ? t.colors.fg : t.colors.fgDim }]}>
                    {variant.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.current, { color: t.colors.metaFg }]}>Current: {selected.name}</Text>
          {!supportsDynamicIcons ? (
            <Text style={[styles.note, { color: t.colors.metaFg }]}>
              App icon switching is not available on this device build.
            </Text>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
  },
  safe: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
  },
  headerLogoSlot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
  },
  content: {
    paddingBottom: 24,
  },
  title: {
    marginTop: 2,
    fontFamily: fonts.medium,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 8,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.14,
  },
  grid: {
    marginTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 18,
  },
  tileWrap: {
    width: '31.5%',
    alignItems: 'center',
  },
  tile: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    right: 6,
    top: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    lineHeight: 12,
  },
  tileLabel: {
    marginTop: 8,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  current: {
    marginTop: 18,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  note: {
    marginTop: 8,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
  },
});
