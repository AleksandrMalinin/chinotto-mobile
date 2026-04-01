import Constants from 'expo-constants';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChinottoLogo, chinottoLogoLeadingOutset } from '../components/ChinottoLogo';
import { SettingsRow } from '../components/settings/SettingsRow';
import { SettingsSection } from '../components/settings/SettingsSection';
import { fonts, screenContentGutter, useAppTheme } from '../theme';

type SettingsScreenProps = {
  onClose: () => void;
  onOpenSync: () => void;
  onOpenManifesto: () => void;
  canOpenAppIcon?: boolean;
  onOpenAppIcon?: () => void;
  appIconLabel?: string;
  syncStatusLabel: string;
  hapticsEnabled: boolean;
  onHapticsEnabledChange: (next: boolean) => void;
  onOpenDevMenu?: () => void;
};

export function SettingsScreen({
  onClose,
  onOpenSync,
  onOpenManifesto,
  canOpenAppIcon = false,
  onOpenAppIcon,
  appIconLabel = 'Default',
  syncStatusLabel,
  hapticsEnabled,
  onHapticsEnabledChange,
  onOpenDevMenu,
}: SettingsScreenProps) {
  const t = useAppTheme();
  const insets = useSafeAreaInsets();
  const appVersion = Constants.expoConfig?.version ?? 'dev';
  const headerLogoSize = 42;
  const gutter = screenContentGutter(0);
  const topInset = Math.max(insets.top, Constants.statusBarHeight ?? 0, 44);
  const headerLogoAlignStyle = {
    marginLeft: -chinottoLogoLeadingOutset(headerLogoSize),
  };

  return (
    <View
      testID="settings-screen"
      style={[
        styles.container,
        {
          backgroundColor: t.colors.bg,
        },
      ]}
    >
      <SafeAreaView style={styles.safe} edges={['right', 'left']}>
          <View
            style={[
              styles.headerBar,
              {
                paddingHorizontal: gutter,
                paddingTop: topInset + t.spacing.xs,
                marginBottom: t.spacing.sm,
              },
            ]}
          >
            <View style={styles.headerLogoSlot}>
              <Pressable
                testID="settings-logo"
                accessibilityRole="button"
                accessibilityLabel="Chinotto"
                accessibilityHint="Back to capture"
                onPress={onClose}
                hitSlop={12}
                style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
              >
                <ChinottoLogo
                  size={headerLogoSize}
                  color={t.colors.fgDim}
                  style={headerLogoAlignStyle}
                />
              </Pressable>
              <Text style={[styles.headerTitleInline, { color: t.colors.fg }]}>Settings</Text>
            </View>
          </View>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.content,
              {
                paddingHorizontal: gutter,
                paddingBottom: Math.max(insets.bottom + 2, 6),
              },
            ]}
            contentInsetAdjustmentBehavior="never"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.contentInner}>
              <View>
                <SettingsSection title="Sync">
                  <SettingsRow
                    variant="navigation"
                    label={syncStatusLabel === 'Off' ? 'Enable sync' : 'Sync'}
                    description="Continue on desktop with the same Apple ID."
                    valueLabel={syncStatusLabel}
                    onPress={onOpenSync}
                  />
                </SettingsSection>

              {canOpenAppIcon && onOpenAppIcon ? (
                <SettingsSection title="Appearance">
                  <SettingsRow
                    testID="settings-open-app-icon"
                    variant="navigation"
                    label="App icon"
                    valueLabel={appIconLabel}
                    onPress={onOpenAppIcon}
                  />
                </SettingsSection>
              ) : null}

              <SettingsSection title="Experience">
                <SettingsRow
                  variant="switch"
                  label="Haptic feedback"
                  description="Subtle taps for key controls."
                  value={hapticsEnabled}
                  onValueChange={onHapticsEnabledChange}
                />
              </SettingsSection>

              <SettingsSection title="Privacy">
                <SettingsRow
                  variant="info"
                  label="Your thoughts stay local first"
                  description="Sync is optional and never blocks capture."
                  isLast
                />
              </SettingsSection>

              <SettingsSection title="Manifesto">
                <SettingsRow
                  testID="settings-open-manifesto"
                  variant="navigation"
                  label="Read"
                  description="Why Chinotto avoids organization before thinking."
                  onPress={onOpenManifesto}
                  isLast
                />
              </SettingsSection>

              <View style={[styles.versionBlock, { borderColor: t.colors.border, backgroundColor: t.colors.accentSubtle }]}>
                <View style={styles.versionRow}>
                  <Text style={[styles.versionLabel, { color: t.colors.metaFg }]}>Version</Text>
                  <View style={styles.versionValueWrap}>
                    <Text style={[styles.versionValue, { color: t.colors.fgDim }]}>{appVersion}</Text>
                    <Text style={[styles.versionBeta, { color: t.colors.metaFg }]}>β</Text>
                  </View>
                </View>
              </View>

              {onOpenDevMenu ? (
                <SettingsSection title="Developer">
                  <SettingsRow
                    testID="settings-open-dev-menu"
                    variant="navigation"
                    label="Developer tools"
                    description="Debug and QA actions."
                    onPress={onOpenDevMenu}
                    isLast
                  />
                </SettingsSection>
              ) : null}
            </View>

              <View>
                <View style={styles.studioSignatureInline}>
                  <Text style={[styles.studioSignatureText, { color: 'rgba(160, 170, 255, 0.35)' }]}>
                    Bogart Labs
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  contentInner: {
    flexGrow: 1,
    justifyContent: 'space-between',
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
  headerTitleInline: {
    marginLeft: 8,
    fontFamily: fonts.medium,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  versionBlock: {
    marginTop: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    overflow: 'hidden',
  },
  versionRow: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  versionLabel: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.1,
  },
  versionValue: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0.15,
  },
  versionValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  versionBeta: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
    opacity: 0.85,
  },
  studioSignatureInline: {
    marginTop: 20,
    alignItems: 'center',
  },
  studioSignatureText: {
    fontFamily: fonts.regular,
    fontSize: 10,
    letterSpacing: 0.4,
    opacity: 0.8,
  },
});
