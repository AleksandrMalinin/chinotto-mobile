import Constants from 'expo-constants';
import { useContext, useEffect } from 'react';
import { Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChinottoLogo, chinottoLogoLeadingOutset } from '../components/ChinottoLogo';
import { SettingsRow } from '../components/settings/SettingsRow';
import { SettingsSection } from '../components/settings/SettingsSection';
import { AdaptiveChromeContext, fonts, screenContentGutter, spacing, useAppTheme } from '../theme';

type SettingsScreenProps = {
  onClose: () => void;
  onOpenSync: () => void;
  /** Anonymous Umami analytics; off until the user opts in. */
  analyticsEnabled?: boolean;
  onAnalyticsOptInChange?: (enabled: boolean) => void;
  onOpenManifesto: () => void;
  canOpenAppIcon?: boolean;
  onOpenAppIcon?: () => void;
  appIconLabel?: string;
  syncStatusLabel: string;
  /** Settings → Account (Delete Account). Production: signed-in only; `__DEV__`: always when Firebase is configured (iOS). */
  accountSectionVisible?: boolean;
  accountIdentityLabel?: string;
  linkedProviderLabels?: string[];
  canLinkApple?: boolean;
  canLinkGoogle?: boolean;
  onLinkApple?: () => void;
  onLinkGoogle?: () => void;
  accountLinkBusy?: boolean;
  accountLinkError?: string | null;
  onOpenDeleteAccount?: () => void;
  onOpenDevMenu?: () => void;
};

export function SettingsScreen({
  onClose,
  onOpenSync,
  analyticsEnabled = false,
  onAnalyticsOptInChange,
  onOpenManifesto,
  canOpenAppIcon = false,
  onOpenAppIcon,
  appIconLabel = 'Default',
  syncStatusLabel,
  accountSectionVisible = false,
  accountIdentityLabel = 'Apple ID',
  linkedProviderLabels = [],
  canLinkApple = false,
  canLinkGoogle = false,
  onLinkApple,
  onLinkGoogle,
  accountLinkBusy = false,
  accountLinkError = null,
  onOpenDeleteAccount,
  onOpenDevMenu,
}: SettingsScreenProps) {
  const { displayChrome, setDisplayChrome } = useContext(AdaptiveChromeContext);
  const t = useAppTheme();
  const insets = useSafeAreaInsets();
  const appVersion = Constants.expoConfig?.version ?? 'dev';
  const headerLogoSize = 42;
  const gutter = screenContentGutter(0);
  const topInset = Math.max(insets.top, Constants.statusBarHeight ?? 0, 44);
  const headerLogoAlignStyle = {
    marginLeft: -chinottoLogoLeadingOutset(headerLogoSize),
  };

  useEffect(() => {
    Keyboard.dismiss();
  }, []);

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
                  color={t.colors.logoMark}
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
            keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'none'}
          >
            <View style={styles.contentInner}>
              <View>
                <SettingsSection title="Sync" isFirst>
                  <SettingsRow
                    variant="navigation"
                    label={syncStatusLabel === 'Off' ? 'Enable sync' : 'Manage'}
                    description="Use the same linked account in the desktop app."
                    valueLabel={syncStatusLabel}
                    onPress={onOpenSync}
                  />
                </SettingsSection>

              <SettingsSection title="Appearance">
                <SettingsRow
                  testID="settings-chrome-auto"
                  variant="choice"
                  label="Auto"
                  description="Adapts to your environment."
                  selected={displayChrome === 'auto'}
                  onPress={() => setDisplayChrome('auto')}
                />
                <SettingsRow
                  testID="settings-chrome-normal"
                  variant="choice"
                  label="Standard"
                  description="Original Chinotto look."
                  selected={displayChrome === 'normal'}
                  onPress={() => setDisplayChrome('normal')}
                />
                <SettingsRow
                  testID="settings-chrome-sunlight"
                  variant="choice"
                  label="Sunlight"
                  description="High contrast for bright conditions."
                  selected={displayChrome === 'sunlight'}
                  onPress={() => setDisplayChrome('sunlight')}
                  isLast={!canOpenAppIcon || !onOpenAppIcon}
                />
                {canOpenAppIcon && onOpenAppIcon ? (
                  <SettingsRow
                    testID="settings-open-app-icon"
                    variant="navigation"
                    label="App icon"
                    valueLabel={appIconLabel}
                    onPress={onOpenAppIcon}
                    isLast
                  />
                ) : null}
              </SettingsSection>

              <SettingsSection title="Privacy">
                <SettingsRow
                  variant="info"
                  label="Your thoughts stay local first"
                  description="Sync is optional and never blocks capture."
                  isLast={onAnalyticsOptInChange == null}
                />
                {onAnalyticsOptInChange ? (
                  <SettingsRow
                    variant="switch"
                    label="Anonymous usage analytics"
                    description="No thoughts. Nothing personal."
                    value={analyticsEnabled}
                    onValueChange={onAnalyticsOptInChange}
                    isLast
                  />
                ) : null}
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

              {accountSectionVisible && onOpenDeleteAccount ? (
                <SettingsSection title="Account">
                  <SettingsRow variant="info" label={accountIdentityLabel} description="Cloud account" />
                  {linkedProviderLabels.length > 0 ? (
                    <SettingsRow
                      variant="info"
                      label="Connected sign-in"
                      description={linkedProviderLabels.join(', ')}
                    />
                  ) : null}
                  {canLinkGoogle && onLinkGoogle ? (
                    <SettingsRow
                      variant="navigation"
                      label={accountLinkBusy ? 'Linking Google…' : 'Link Google'}
                      description="Use one cloud profile across Android and desktop."
                      onPress={accountLinkBusy ? undefined : onLinkGoogle}
                    />
                  ) : null}
                  {canLinkApple && onLinkApple ? (
                    <SettingsRow
                      variant="navigation"
                      label={accountLinkBusy ? 'Linking Apple…' : 'Link Apple'}
                      description="Use one cloud profile across iPhone and desktop."
                      onPress={accountLinkBusy ? undefined : onLinkApple}
                    />
                  ) : null}
                  {accountLinkError ? (
                    <SettingsRow variant="info" label={accountLinkError} description="Account linking" />
                  ) : null}
                  <SettingsRow
                    testID="settings-delete-account"
                    variant="destructive"
                    label="Delete Account"
                    description="Permanently removes your Chinotto cloud account and synced data."
                    onPress={onOpenDeleteAccount}
                    isLast
                  />
                </SettingsSection>
              ) : null}

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
    marginLeft: spacing.xs,
    fontFamily: fonts.medium,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  versionBlock: {
    marginTop: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    overflow: 'hidden',
  },
  versionRow: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 8,
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
    marginTop: 12,
    alignItems: 'center',
  },
  studioSignatureText: {
    fontFamily: fonts.regular,
    fontSize: 10,
    letterSpacing: 0.4,
    opacity: 0.8,
  },
});
