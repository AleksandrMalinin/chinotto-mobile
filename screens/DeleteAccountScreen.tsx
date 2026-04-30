import Constants from 'expo-constants';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { track } from '../analytics/analytics';
import { AppleUserCanceledError } from '../auth/appleSignInCredential';
import { ChinottoLogo, chinottoLogoLeadingOutset } from '../components/ChinottoLogo';
import {
  AccountDeletionNeedsRecentLogin,
  DeleteChinottoAccountError,
  deleteChinottoAccountForCurrentUser,
  resumeChinottoAccountDeletionAfterReauth,
} from '../sync/deleteChinottoAccount';
import { fonts, screenContentGutter, spacing, useAppTheme } from '../theme';

const COPY_MAIN =
  'Deleting your Chinotto account will permanently remove your synced data from the cloud.';
const COPY_SUBSCRIPTION =
  'Your App Store subscription is managed by Apple and will not be canceled automatically. To stop future billing, cancel your subscription in App Store settings before deleting your account.';
const COPY_FINAL = 'This will permanently delete your Chinotto account and all synced data.';
const COPY_RECENT_LOGIN = 'Please sign in again to confirm account deletion.';
const IOS_MANAGE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

type DeleteAccountScreenProps = {
  onClose: () => void;
  /** Called after successful deletion (Auth user removed + local sync queues cleared). */
  onAccountDeleted: () => void;
};

export function DeleteAccountScreen({ onClose, onAccountDeleted }: DeleteAccountScreenProps) {
  const t = useAppTheme();
  const insets = useSafeAreaInsets();
  const headerLogoSize = 42;
  const gutter = screenContentGutter(0);
  const topInset = Math.max(insets.top, Constants.statusBarHeight ?? 0, 44);
  const headerLogoAlignStyle = {
    marginLeft: -chinottoLogoLeadingOutset(headerLogoSize),
  };

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  useEffect(() => {
    track({ event: 'delete_account_opened' });
  }, []);

  const openManageSubscriptions = useCallback(() => {
    void Linking.openURL(IOS_MANAGE_SUBSCRIPTIONS_URL).catch(() => {});
  }, []);

  const runResumeAfterRecentLogin = useCallback(async () => {
    setBusy(true);
    setErrorBanner(null);
    try {
      await resumeChinottoAccountDeletionAfterReauth();
      track({ event: 'delete_account_success' });
      setConfirmOpen(false);
      onAccountDeleted();
    } catch (e: unknown) {
      if (e instanceof AppleUserCanceledError) {
        track({ event: 'delete_account_failed', failure_kind: 'user_cancelled' });
        setErrorBanner(COPY_RECENT_LOGIN);
        return;
      }
      if (e instanceof DeleteChinottoAccountError) {
        track({ event: 'delete_account_failed', failure_kind: e.failure });
        setErrorBanner(
          e.failure === 'network'
            ? 'Check your connection and try again.'
            : 'Something went wrong. Try again.'
        );
        return;
      }
      track({ event: 'delete_account_failed', failure_kind: 'unknown' });
      setErrorBanner('Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }, [onAccountDeleted]);

  const promptRecentLogin = useCallback(() => {
    Alert.alert('', COPY_RECENT_LOGIN, [
      { text: 'Cancel', style: 'cancel', onPress: () => setBusy(false) },
      {
        text: 'Continue',
        onPress: () => {
          void runResumeAfterRecentLogin();
        },
      },
    ]);
  }, [runResumeAfterRecentLogin]);

  const runDeletion = useCallback(async () => {
    setConfirmOpen(false);
    setBusy(true);
    setErrorBanner(null);
    try {
      await deleteChinottoAccountForCurrentUser();
      track({ event: 'delete_account_success' });
      setConfirmOpen(false);
      onAccountDeleted();
    } catch (e: unknown) {
      if (e instanceof AccountDeletionNeedsRecentLogin) {
        promptRecentLogin();
        return;
      }
      if (e instanceof DeleteChinottoAccountError) {
        track({ event: 'delete_account_failed', failure_kind: e.failure });
        setErrorBanner(
          e.failure === 'network'
            ? 'Check your connection and try again.'
            : e.failure === 'not_signed_in'
              ? 'You are not signed in.'
              : 'Something went wrong. Try again.'
        );
        return;
      }
      track({ event: 'delete_account_failed', failure_kind: 'unknown' });
      setErrorBanner('Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }, [onAccountDeleted, promptRecentLogin]);

  const onConfirmDeletePermanently = useCallback(() => {
    track({ event: 'delete_account_confirmed' });
    void runDeletion();
  }, [runDeletion]);

  return (
    <View testID="delete-account-screen" style={[styles.container, { backgroundColor: t.colors.bg }]}>
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
              testID="delete-account-back-logo"
              accessibilityRole="button"
              accessibilityLabel="Chinotto"
              accessibilityHint="Back to settings"
              onPress={onClose}
              hitSlop={12}
              disabled={busy}
              style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
            >
              <ChinottoLogo size={headerLogoSize} color={t.colors.logoMark} style={headerLogoAlignStyle} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: gutter,
              paddingBottom: Math.max(insets.bottom + 12, 20),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { color: t.colors.fg }]}>Delete account?</Text>

          <Text style={[styles.body, { color: t.colors.fgDim }]}>{COPY_MAIN}</Text>
          <Text style={[styles.body, { color: t.colors.fgDim, marginTop: spacing.sm }]}>{COPY_SUBSCRIPTION}</Text>
          <Text style={[styles.bodyStrong, { color: t.colors.fg, marginTop: spacing.sm }]}>
            This action cannot be undone.
          </Text>

          {errorBanner ? (
            <View style={[styles.errorBanner, { borderColor: t.colors.border, backgroundColor: t.colors.accentSubtle }]}>
              <Text style={[styles.errorBannerText, { color: t.colors.fgDim }]}>{errorBanner}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retry account deletion"
                onPress={() => void runDeletion()}
                disabled={busy}
                style={({ pressed }) => [styles.retryBtn, { opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={[styles.retryBtnLabel, { color: t.colors.fg }]}>Retry</Text>
              </Pressable>
            </View>
          ) : null}

          {Platform.OS === 'ios' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Manage Subscription"
              onPress={openManageSubscriptions}
              disabled={busy}
              style={({ pressed }) => [styles.manageLink, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={[styles.manageLinkText, { color: t.colors.metaFg }]}>Manage Subscription</Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete account"
            onPress={() => setConfirmOpen(true)}
            disabled={busy}
            style={({ pressed }) => [
              styles.primaryDestructive,
              {
                borderColor: 'rgba(255, 146, 146, 0.35)',
                backgroundColor: pressed ? 'rgba(255, 146, 146, 0.08)' : 'rgba(255, 146, 146, 0.04)',
              },
            ]}
          >
            {busy ? (
              <ActivityIndicator color="rgba(255, 146, 146, 0.95)" />
            ) : (
              <Text style={[styles.primaryDestructiveLabel, { color: 'rgba(255, 146, 146, 0.95)' }]}>
                Delete account
              </Text>
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            onPress={onClose}
            disabled={busy}
            style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={[styles.secondaryBtnLabel, { color: t.colors.fg }]}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>

      <Modal visible={confirmOpen} transparent animationType="fade" onRequestClose={() => setConfirmOpen(false)}>
        <Pressable
          style={[styles.modalBackdrop, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
          onPress={() => !busy && setConfirmOpen(false)}
        >
          <Pressable style={[styles.modalCard, { backgroundColor: t.colors.bgElevated, borderColor: t.colors.border }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: t.colors.fg }]}>Are you sure?</Text>
            <Text style={[styles.modalBody, { color: t.colors.fgDim }]}>{COPY_FINAL}</Text>
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete permanently"
                onPress={onConfirmDeletePermanently}
                disabled={busy}
                style={({ pressed }) => [
                  styles.modalDestructive,
                  { opacity: pressed ? 0.92 : 1, backgroundColor: 'rgba(220, 38, 38, 0.92)' },
                ]}
              >
                <Text style={styles.modalDestructiveLabel}>Delete permanently</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel deletion"
                onPress={() => !busy && setConfirmOpen(false)}
                disabled={busy}
                style={({ pressed }) => [styles.modalSecondary, { opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={[styles.modalSecondaryLabel, { color: t.colors.fg }]}>Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 22,
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
    flexGrow: 1,
  },
  title: {
    fontFamily: fonts.medium,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0.15,
    marginBottom: spacing.md,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  bodyStrong: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  errorBanner: {
    marginTop: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  errorBannerText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  retryBtnLabel: {
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  manageLink: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  manageLinkText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    letterSpacing: 0.1,
    textDecorationLine: 'underline',
  },
  primaryDestructive: {
    marginTop: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryDestructiveLabel: {
    fontFamily: fonts.medium,
    fontSize: 16,
    letterSpacing: 0.15,
  },
  secondaryBtn: {
    marginTop: spacing.sm,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnLabel: {
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
  },
  modalTitle: {
    fontFamily: fonts.medium,
    fontSize: 18,
    marginBottom: 10,
  },
  modalBody: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 18,
  },
  modalActions: {
    gap: 10,
  },
  modalDestructive: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalDestructiveLabel: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: '#fff',
  },
  modalSecondary: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalSecondaryLabel: {
    fontFamily: fonts.regular,
    fontSize: 16,
  },
});
