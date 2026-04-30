import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { track } from '../analytics/analytics';
import { AppleUserCanceledError } from '../auth/appleSignInCredential';
import {
  AccountDeletionNeedsRecentLogin,
  DeleteChinottoAccountError,
  deleteChinottoAccountForCurrentUser,
  resumeChinottoAccountDeletionAfterReauth,
} from '../sync/deleteChinottoAccount';
import { fonts, radius, spacing, useAppTheme } from '../theme';

const COPY_MAIN =
  'Deleting your Chinotto account will permanently remove your synced data from the cloud.';
const COPY_SUBSCRIPTION =
  'Your App Store subscription is managed by Apple and will not be canceled automatically. To stop future billing, cancel your subscription in App Store settings before deleting your account.';
const COPY_FINAL = 'This will permanently delete your Chinotto account and all synced data.';
const COPY_RECENT_LOGIN = 'Please sign in again to confirm account deletion.';
const IOS_MANAGE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

/**
 * Account removal step 1 (App Store 5.1.1(v)): required warning copy + Manage Subscription + primary CTA.
 * Same presentation shell as `EnableSyncModal`: transparent fade `Modal`, dimmed backdrop, centered sheet.
 * Step 2 is a nested confirmation `Modal` with explicit destructive styling.
 */

type DeleteAccountScreenProps = {
  visible: boolean;
  onClose: () => void;
  /** Called after successful deletion (Auth user removed + local sync queues cleared). */
  onAccountDeleted: () => void;
};

export function DeleteAccountScreen({ visible, onClose, onAccountDeleted }: DeleteAccountScreenProps) {
  const t = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
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

  const sheetShadowLift = t.sunlightMode
    ? Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOpacity: 0.22,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
        },
        android: { elevation: 8 },
        default: {},
      }) ?? {}
    : {};

  /** Same top + bottom inset on the sheet (home indicator drives both sides equally). */
  const sheetVerticalPad = Math.max(spacing.lg, insets.bottom + spacing.sm);

  return (
    <>
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <Pressable
          testID="delete-account-modal-backdrop"
          accessibilityLabel="Dismiss"
          accessibilityRole="button"
          style={styles.backdrop}
          onPress={onClose}
          disabled={busy}
        >
          <View
            testID="delete-account-screen"
            style={[
              styles.sheet,
              sheetShadowLift,
              {
                maxHeight: windowHeight * 0.92,
                paddingTop: sheetVerticalPad,
                paddingBottom: sheetVerticalPad,
                backgroundColor: t.sunlightMode ? t.colors.bgElevated : 'rgba(18, 18, 26, 0.9)',
                borderColor: t.colors.border,
              },
            ]}
          >
            {t.sunlightMode ? null : (
              <>
                <View pointerEvents="none" style={styles.sheetAuraViolet} />
                <View pointerEvents="none" style={styles.sheetAuraBlue} />
              </>
            )}
            <View
              pointerEvents="none"
              style={[
                styles.sheetInnerRing,
                t.sunlightMode ? { borderColor: 'rgba(255,255,255,0.22)' } : null,
              ]}
            />
            <View style={styles.sheetContent}>
              <Text style={[styles.title, { color: t.colors.fg }]}>Delete account?</Text>

              <Text style={[styles.body, { color: t.colors.fgDim }]}>{COPY_MAIN}</Text>
              <Text style={[styles.body, styles.bodyGapAfterMain, { color: t.colors.fgDim }]}>{COPY_SUBSCRIPTION}</Text>
              <Text style={[styles.irreversibleLine, { color: t.colors.entryBody }]}>This action cannot be undone.</Text>

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
                  style={({ pressed }) => [styles.manageLink, { opacity: pressed ? 0.8 : 1 }]}
                >
                  <Text
                    style={[
                      styles.manageLinkText,
                      { color: t.colors.muted, textDecorationColor: t.colors.muted },
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
                      opacity: pressed ? 0.9 : 1,
                      transform: [{ scale: pressed ? 0.985 : 1 }],
                    },
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator color={t.colors.accountDeletionPrimaryLabel} />
                  ) : (
                    <Text style={[styles.primaryDestructiveLabel, { color: t.colors.accountDeletionPrimaryLabel }]}>
                      Delete account
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  onPress={onClose}
                  disabled={busy}
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    { opacity: pressed ? 0.75 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
                  ]}
                >
                  <Text style={[styles.secondaryBtnLabel, { color: t.colors.muted }]}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Pressable>
      </Modal>

      {confirmOpen ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setConfirmOpen(false)}>
          <Pressable
            style={[styles.modalBackdrop, { backgroundColor: 'rgba(0,0,0,0.54)' }]}
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
                    styles.modalPrimaryDestructive,
                    {
                      borderColor: t.colors.accountDeletionPrimaryBorder,
                      backgroundColor: t.colors.accountDeletionPrimaryFill,
                      opacity: pressed ? 0.9 : 1,
                      transform: [{ scale: pressed ? 0.985 : 1 }],
                    },
                  ]}
                >
                  <Text style={[styles.modalPrimaryDestructiveLabel, { color: t.colors.accountDeletionPrimaryLabel }]}>
                    Delete permanently
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel deletion"
                  onPress={() => !busy && setConfirmOpen(false)}
                  disabled={busy}
                  style={({ pressed }) => [
                    styles.modalSecondary,
                    { opacity: pressed ? 0.75 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
                  ]}
                >
                  <Text style={[styles.modalSecondaryLabel, { color: t.colors.muted }]}>Cancel</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.54)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  sheet: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 38,
    shadowOffset: { width: 0, height: 19 },
    elevation: 14,
    overflow: 'visible',
  },
  sheetAuraViolet: {
    position: 'absolute',
    top: -7,
    right: -7,
    bottom: -7,
    left: -7,
    borderRadius: radius.md + 7,
    backgroundColor: 'transparent',
    shadowColor: '#646eb4',
    shadowOpacity: 0.14,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 0 },
  },
  sheetAuraBlue: {
    position: 'absolute',
    top: -16,
    right: -16,
    bottom: -16,
    left: -16,
    borderRadius: radius.md + 16,
    backgroundColor: 'transparent',
    shadowColor: '#4664b4',
    shadowOpacity: 0.085,
    shadowRadius: 44,
    shadowOffset: { width: 0, height: 0 },
  },
  sheetInnerRing: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  sheetContent: {
    alignSelf: 'stretch',
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
    lineHeight: 24,
    letterSpacing: 0.1,
  },
  bodyGapAfterMain: {
    marginTop: spacing.md,
  },
  irreversibleLine: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 23,
    letterSpacing: 0.12,
    marginTop: spacing.lg,
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
  /** One step above copy stack (`spacing.md` between text blocks); separates CTAs from content. */
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
  primaryDestructiveLabel: {
    fontFamily: fonts.medium,
    fontSize: 16,
    letterSpacing: 0.15,
  },
  secondaryBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnLabel: {
    fontFamily: fonts.regular,
    fontSize: 15,
    letterSpacing: 0.1,
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
    lineHeight: 24,
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
  modalPrimaryDestructiveLabel: {
    fontFamily: fonts.medium,
    fontSize: 16,
    letterSpacing: 0.15,
  },
  modalSecondary: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalSecondaryLabel: {
    fontFamily: fonts.regular,
    fontSize: 15,
    letterSpacing: 0.1,
  },
});
