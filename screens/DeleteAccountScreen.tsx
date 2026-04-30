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
  useWindowDimensions,
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

/**
 * Account removal (App Store 5.1.1(v)): warning + Manage Subscription + primary CTA.
 * Rendered inside `CaptureScreen` `Modal`: same fade / `presentationStyle` pattern as `EntryReadSheet`.
 * Body copy uses the same 17 / 26 rhythm as the read sheet; toolbar-style actions use 15 medium / 20 like Open / Copy.
 * Step 2 is an in-page confirmation `Modal` over this surface.
 */

type DeleteAccountScreenProps = {
  visible: boolean;
  onClose: () => void;
  /** Called after successful deletion (Auth user removed + local sync queues cleared). */
  onAccountDeleted: () => void;
};

export function DeleteAccountScreen({ visible, onClose, onAccountDeleted }: DeleteAccountScreenProps) {
  const t = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { body, meta } = t.typography;
  const headerLogoSize = 42;
  const gutter = screenContentGutter(windowWidth);
  const topInset = Math.max(insets.top, Constants.statusBarHeight ?? 0, 44);
  /** Matches `EntryReadSheet` entry body (compact layout: lineHeight 26). */
  const readBody = {
    fontFamily: body.fontFamily,
    fontSize: 17,
    lineHeight: 26,
    letterSpacing: 0.15,
  };
  /** Matches `EntryReadSheet` Open / Copy labels. */
  const readAction = {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.2,
  };
  const headerLogoAlignStyle = {
    marginLeft: -chinottoLogoLeadingOutset(headerLogoSize),
  };

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setConfirmOpen(false);
      return;
    }
    track({ event: 'delete_account_opened' });
  }, [visible]);

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
    <View testID="delete-account-screen" style={[styles.pageRoot, { backgroundColor: t.colors.bg }]}>
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
              hitSlop={10}
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
          <Text style={[styles.title, readBody, { fontFamily: fonts.medium, color: t.colors.fg }]}>Delete account?</Text>

          <Text style={[readBody, { color: t.colors.fgDim }]}>{COPY_MAIN}</Text>
          <Text style={[readBody, styles.bodyGapAfterMain, { color: t.colors.fgDim }]}>{COPY_SUBSCRIPTION}</Text>
          <Text
            style={[
              readBody,
              styles.irreversibleLine,
              { fontFamily: fonts.medium, color: t.colors.entryBody },
            ]}
          >
            This action cannot be undone.
          </Text>

          {errorBanner ? (
            <View style={[styles.errorBanner, { borderColor: t.colors.border, backgroundColor: t.colors.accentSubtle }]}>
              <Text
                style={{
                  fontFamily: meta.fontFamily,
                  fontSize: meta.fontSize,
                  lineHeight: 19,
                  color: t.colors.fgDim,
                }}
              >
                {errorBanner}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retry account deletion"
                onPress={() => void runDeletion()}
                disabled={busy}
                style={({ pressed }) => [styles.retryBtn, { opacity: pressed ? 0.65 : 1 }]}
              >
                <Text style={[readAction, { color: t.colors.fg }]}>Retry</Text>
              </Pressable>
            </View>
          ) : null}

          {Platform.OS === 'ios' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Manage Subscription"
              onPress={openManageSubscriptions}
              disabled={busy}
              style={({ pressed }) => [styles.manageLink, { opacity: pressed ? 0.65 : 1 }]}
            >
              <Text
                style={[
                  styles.manageLinkText,
                  {
                    fontFamily: meta.fontFamily,
                    fontSize: meta.fontSize,
                    lineHeight: 19,
                    color: t.colors.metaFg,
                    textDecorationColor: t.colors.metaFg,
                  },
                ]}
              >
                Manage Subscription
              </Text>
            </Pressable>
          ) : null}

          <View style={styles.actionBlock}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete account"
              onPress={() => setConfirmOpen(true)}
              disabled={busy}
              style={({ pressed }) => [
                styles.primaryDestructive,
                {
                  borderColor: t.colors.accountDeletionPrimaryBorder,
                  backgroundColor: t.colors.accountDeletionPrimaryFill,
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
            >
              {busy ? (
                <ActivityIndicator color={t.colors.accountDeletionPrimaryLabel} />
              ) : (
                <Text style={[readAction, { color: t.colors.accountDeletionPrimaryLabel }]}>Delete account</Text>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              onPress={onClose}
              disabled={busy}
              style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.65 : 1 }]}
            >
              <Text
                style={[
                  readAction,
                  { fontFamily: body.fontFamily, color: t.colors.fgDim },
                ]}
              >
                Cancel
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={confirmOpen}
        transparent
        animationType="fade"
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : 'fullScreen'}
        statusBarTranslucent
        onRequestClose={() => setConfirmOpen(false)}
      >
        <Pressable
          style={[
            styles.modalBackdrop,
            { backgroundColor: 'rgba(0,0,0,0.54)', paddingHorizontal: gutter },
          ]}
          onPress={() => !busy && setConfirmOpen(false)}
        >
          <Pressable
            style={[styles.modalCard, { backgroundColor: t.colors.bgElevated, borderColor: t.colors.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[readAction, styles.modalTitle, { color: t.colors.fg }]}>Are you sure?</Text>
            <Text style={[readBody, styles.modalBody, { color: t.colors.fgDim }]}>{COPY_FINAL}</Text>
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete permanently"
                accessibilityHint="This cannot be undone."
                onPress={onConfirmDeletePermanently}
                disabled={busy}
                style={({ pressed }) => [
                  styles.modalPrimaryDestructive,
                  {
                    borderColor: t.colors.accountDeletionConfirmBorder,
                    backgroundColor: t.colors.accountDeletionConfirmFill,
                    opacity: pressed ? 0.65 : 1,
                  },
                ]}
              >
                <Text style={[readAction, { color: t.colors.accountDeletionConfirmLabel }]}>
                  Delete permanently
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel deletion"
                onPress={() => !busy && setConfirmOpen(false)}
                disabled={busy}
                style={({ pressed }) => [styles.modalSecondary, { opacity: pressed ? 0.65 : 1 }]}
              >
                <Text style={[readAction, { fontFamily: body.fontFamily, color: t.colors.fgDim }]}>Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  pageRoot: {
    flex: 1,
    alignSelf: 'stretch',
    width: '100%',
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
    marginBottom: spacing.md,
  },
  bodyGapAfterMain: {
    marginTop: spacing.md,
  },
  irreversibleLine: {
    marginTop: spacing.lg,
  },
  errorBanner: {
    marginTop: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  manageLink: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  manageLinkText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    letterSpacing: 0.08,
    textDecorationLine: 'underline',
  },
  actionBlock: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  primaryDestructive: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  secondaryBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
  },
  modalTitle: {
    marginBottom: 10,
  },
  modalBody: {
    marginBottom: 18,
  },
  modalActions: {
    gap: spacing.sm,
  },
  modalPrimaryDestructive: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  modalSecondary: {
    paddingVertical: 12,
    alignItems: 'center',
  },
});
