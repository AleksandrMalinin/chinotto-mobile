import { signOut } from 'firebase/auth';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppleSyncIdentityError } from '../auth/appleFirebaseAuth';
import { AppleUserCanceledError, enableAppleSyncWithFirebase } from '../auth/enableAppleSync';
import { isPaywallEnabled } from '../monetization/paywallConfig';
import { getCachedIsSubscribed, stubCompleteChinottoPlusPurchase } from '../monetization/subscriptionState';
import { getOrInitAuth } from '../sync/firebaseAuth';
import { resolvePushEntryForSync } from '../sync/pushEntryForSync';
import { processSyncQueue } from '../sync/syncEngine';
import { flushSyncTombstoneOutbox } from '../sync/tombstoneFlush';
import { fonts, radius, spacing } from '../theme';

export type SyncModalAuthPhase = 'restoring' | 'signed_in' | 'signed_out';

export type EnableSyncModalProps = {
  visible: boolean;
  onClose: () => void;
  onEnabled: () => void;
  /** Drives copy: enable Apple vs status-only sheet */
  authPhase: SyncModalAuthPhase;
  /** Shown under signed-in copy when upload queue looks stuck (e.g. offline). */
  syncHealthNote?: string | null;
  /** False until persisted subscription state has been loaded (avoid flashing the wrong enable step). */
  subscriptionHydrated: boolean;
  /** After stub or real purchase: restart Firestore ingest if the paywall feature is on. */
  onSubscriptionUnlocked?: () => void;
  /** Design tokens */
  fg: string;
  fgDim: string;
  muted: string;
  bgElevated: string;
  border: string;
};

export function EnableSyncModal({
  visible,
  onClose,
  onEnabled,
  authPhase,
  syncHealthNote = null,
  subscriptionHydrated,
  onSubscriptionUnlocked,
  fg,
  fgDim,
  muted,
  bgElevated,
  border,
}: EnableSyncModalProps) {
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    if (!busy) {
      setErrorMessage(null);
      onClose();
    }
  }, [busy, onClose]);

  const handlePlusContinue = useCallback(async () => {
    setErrorMessage(null);
    setBusy(true);
    try {
      await stubCompleteChinottoPlusPurchase();
      onSubscriptionUnlocked?.();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Something went wrong. Try again.');
      }
    } finally {
      setBusy(false);
    }
  }, [onSubscriptionUnlocked]);

  const handleApple = useCallback(async () => {
    setErrorMessage(null);
    setBusy(true);
    try {
      await enableAppleSyncWithFirebase();
      await processSyncQueue(resolvePushEntryForSync());
      await flushSyncTombstoneOutbox();
      onEnabled();
      onClose();
    } catch (err: unknown) {
      if (err instanceof AppleUserCanceledError) {
        // Calm: no error banner for cancel
      } else if (err instanceof AppleSyncIdentityError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Something went wrong. Try again.');
      }
    } finally {
      setBusy(false);
    }
  }, [onClose, onEnabled]);

  const handleStopSyncing = useCallback(async () => {
    setErrorMessage(null);
    setBusy(true);
    try {
      await signOut(getOrInitAuth());
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Could not stop syncing. Try again.');
      }
    } finally {
      setBusy(false);
    }
  }, [onClose]);

  if (Platform.OS !== 'ios') {
    return null;
  }

  const showEnableFlow = authPhase === 'signed_out';
  const showSubscriptionWait =
    showEnableFlow && isPaywallEnabled() && !subscriptionHydrated;
  const showPlusPaywall =
    showEnableFlow && isPaywallEnabled() && subscriptionHydrated && !getCachedIsSubscribed();
  const showSyncTitle =
    authPhase !== 'signed_out' || (!showPlusPaywall && !showSubscriptionWait);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} disabled={busy}>
        <Pressable
          style={[styles.sheet, { backgroundColor: bgElevated, borderColor: border }]}
          onPress={(ev) => ev.stopPropagation()}
        >
          {showSyncTitle ? (
            <Text style={[styles.title, { color: fg, fontFamily: fonts.medium }]}>Sync</Text>
          ) : null}

          {authPhase === 'restoring' ? (
            <>
              <Text style={[styles.body, { color: fgDim, fontFamily: fonts.regular }]}>
                Checking sign-in…
              </Text>
              <ActivityIndicator style={styles.spinner} color={fg} />
            </>
          ) : null}

          {authPhase === 'signed_in' ? (
            <>
              <Text style={[styles.body, { color: fgDim, fontFamily: fonts.regular }]}>
                You're signed in with Apple. New thoughts sync in the background.
              </Text>
              <Text style={[styles.note, { color: muted, fontFamily: fonts.regular }]}>
                Older thoughts from other devices load in the background; the stream shows recent items
                first.
              </Text>
              {syncHealthNote != null && syncHealthNote !== '' ? (
                <Text
                  style={[styles.error, { color: fgDim, fontFamily: fonts.regular }]}
                  accessibilityLiveRegion="polite"
                >
                  {syncHealthNote}
                </Text>
              ) : null}
            </>
          ) : null}

          {showEnableFlow && showSubscriptionWait ? (
            <>
              <Text style={[styles.body, { color: fgDim, fontFamily: fonts.regular }]}>
                One moment…
              </Text>
              <ActivityIndicator style={styles.spinner} color={fg} />
            </>
          ) : showEnableFlow && showPlusPaywall ? (
            <>
              <View style={styles.paywallHeaderRow}>
                <Text
                  style={[styles.paywallTitle, { color: fg, fontFamily: fonts.medium }]}
                  accessibilityRole="header"
                >
                  Sync your thoughts across devices
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  disabled={busy}
                  hitSlop={12}
                  onPress={handleClose}
                  style={({ pressed }) => [styles.paywallClose, { opacity: pressed ? 0.65 : 1 }]}
                >
                  <Text style={[styles.paywallCloseGlyph, { color: muted, fontFamily: fonts.regular }]}>×</Text>
                </Pressable>
              </View>
              <Text style={[styles.body, { color: fgDim, fontFamily: fonts.regular }]}>
                Everything stays local by default.
              </Text>
              <Text style={[styles.body, { color: fgDim, fontFamily: fonts.regular }]}>
                Sync is optional.
              </Text>
              <Text style={[styles.paywallFooter, { color: muted, fontFamily: fonts.regular }]}>
                Enable it with Chinotto Plus
              </Text>
              {errorMessage != null ? (
                <Text
                  style={[styles.error, { color: fgDim, fontFamily: fonts.regular }]}
                  accessibilityLiveRegion="polite"
                >
                  {errorMessage}
                </Text>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Continue"
                disabled={busy}
                style={({ pressed }) => [
                  styles.appleButton,
                  { backgroundColor: fg, opacity: busy ? 0.5 : pressed ? 0.88 : 1 },
                ]}
                onPress={() => void handlePlusContinue()}
              >
                {busy ? (
                  <ActivityIndicator color={bgElevated} />
                ) : (
                  <Text style={[styles.appleLabel, { color: bgElevated, fontFamily: fonts.medium }]}>
                    Continue
                  </Text>
                )}
              </Pressable>
            </>
          ) : showEnableFlow ? (
            <>
              <Text style={[styles.body, { color: fgDim, fontFamily: fonts.regular }]}>
                Use Apple to connect your devices.
              </Text>
              <Text style={[styles.note, { color: muted, fontFamily: fonts.regular }]}>
                Chinotto does not create its own account.
              </Text>

              {errorMessage != null ? (
                <Text
                  style={[styles.error, { color: fgDim, fontFamily: fonts.regular }]}
                  accessibilityLiveRegion="polite"
                >
                  {errorMessage}
                </Text>
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Continue with Apple"
                disabled={busy}
                style={({ pressed }) => [
                  styles.appleButton,
                  { backgroundColor: fg, opacity: busy ? 0.5 : pressed ? 0.88 : 1 },
                ]}
                onPress={() => void handleApple()}
              >
                {busy ? (
                  <ActivityIndicator color={bgElevated} />
                ) : (
                  <Text style={[styles.appleLabel, { color: bgElevated, fontFamily: fonts.medium }]}>
                    Continue with Apple
                  </Text>
                )}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                disabled={busy}
                onPress={handleClose}
                style={styles.later}
              >
                <Text style={{ color: muted, fontFamily: fonts.regular }}>Not now</Text>
              </Pressable>
            </>
          ) : authPhase === 'signed_in' ? (
            <>
              {errorMessage != null ? (
                <Text
                  style={[styles.error, { color: fgDim, fontFamily: fonts.regular }]}
                  accessibilityLiveRegion="polite"
                >
                  {errorMessage}
                </Text>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Done"
                disabled={busy}
                onPress={handleClose}
                style={({ pressed }) => [styles.doneButton, { opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={{ color: fg, fontFamily: fonts.medium, fontSize: 16 }}>Done</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Stop syncing on this device"
                accessibilityHint="Signs out of Apple sync. Your thoughts stay on this device."
                disabled={busy}
                onPress={() => void handleStopSyncing()}
                style={styles.stopSync}
              >
                <Text style={{ color: muted, fontFamily: fonts.regular, fontSize: 15 }}>Stop syncing</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Done"
              disabled={busy}
              onPress={handleClose}
              style={({ pressed }) => [styles.doneButton, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={{ color: fg, fontFamily: fonts.medium, fontSize: 16 }}>Done</Text>
            </Pressable>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  sheet: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
  },
  title: {
    fontSize: 20,
    marginBottom: spacing.sm,
  },
  paywallHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  paywallTitle: {
    flex: 1,
    fontSize: 19,
    lineHeight: 26,
  },
  paywallClose: {
    paddingTop: 2,
    paddingLeft: spacing.xs,
  },
  paywallCloseGlyph: {
    fontSize: 28,
    lineHeight: 30,
  },
  paywallFooter: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  note: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  error: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  appleButton: {
    borderRadius: radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  appleLabel: {
    fontSize: 16,
  },
  later: {
    marginTop: spacing.md,
    alignSelf: 'center',
    paddingVertical: spacing.xs,
  },
  spinner: {
    marginVertical: spacing.lg,
  },
  doneButton: {
    marginTop: spacing.md,
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  stopSync: {
    marginTop: spacing.md,
    alignSelf: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
});
