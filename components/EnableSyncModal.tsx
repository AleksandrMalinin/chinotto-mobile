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
import { fonts, radius, spacing } from '../theme';

export type SyncModalAuthPhase = 'restoring' | 'signed_in' | 'signed_out';

export type EnableSyncModalProps = {
  visible: boolean;
  onClose: () => void;
  onEnabled: () => void;
  /** Drives copy: enable Apple vs status-only sheet */
  authPhase: SyncModalAuthPhase;
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

  const handleApple = useCallback(async () => {
    setErrorMessage(null);
    setBusy(true);
    try {
      await enableAppleSyncWithFirebase();
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

  if (Platform.OS !== 'ios') {
    return null;
  }

  const showEnableFlow = authPhase === 'signed_out';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} disabled={busy}>
        <Pressable
          style={[styles.sheet, { backgroundColor: bgElevated, borderColor: border }]}
          onPress={(ev) => ev.stopPropagation()}
        >
          <Text style={[styles.title, { color: fg, fontFamily: fonts.medium }]}>Sync</Text>

          {authPhase === 'restoring' ? (
            <>
              <Text style={[styles.body, { color: fgDim, fontFamily: fonts.regular }]}>
                Checking sign-in…
              </Text>
              <ActivityIndicator style={styles.spinner} color={fg} />
            </>
          ) : null}

          {authPhase === 'signed_in' ? (
            <Text style={[styles.body, { color: fgDim, fontFamily: fonts.regular }]}>
              You're signed in with Apple. New thoughts sync in the background.
            </Text>
          ) : null}

          {showEnableFlow ? (
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
});
