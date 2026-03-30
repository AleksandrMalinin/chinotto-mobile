import { useCallback, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getPaywallDebugInfo, isPaywallEnabled } from '../monetization/paywallConfig';
import { getCachedHasSyncEntitlement, getSyncEntitlementSourcesDebug } from '../monetization/subscriptionState';
import {
  CHINOTTO_PACKAGE_KIND_ORDER,
} from '../src/services/purchases/constants';
import { fonts, radius, spacing } from '../theme';
import { useEnableSyncController } from './useEnableSyncController';

/** Web app URL for “continue on desktop” (replace when a dedicated download page exists). */
export const CHINOTTO_DESKTOP_WEB_URL = 'https://getchinotto.app/';

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
  /** After RevenueCat purchase or entitlement refresh: parent can restart Firestore ingest when paywall is on. */
  onSubscriptionUnlocked?: () => void;
  /**
   * `__DEV__` only: increment to force the post-sync success UI (desktop link) for repeated QA.
   * Parent should bump when opening the sheet from the dev menu.
   */
  devPostSyncPreviewNonce?: number;
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
  devPostSyncPreviewNonce,
  fg,
  fgDim,
  muted,
  bgElevated,
  border,
}: EnableSyncModalProps) {
  const {
    busy,
    errorMessage,
    selectedPackageKind,
    setSelectedPackageKind,
    paywallPlans,
    paywallPlansLoading,
    postSyncSuccess,
    desktopLinkCopied,
    handleCopyDesktopLink,
    handlePlusContinue,
    handleRestorePurchases,
    handleApple,
    handleStopSyncing,
  } = useEnableSyncController({
    visible,
    authPhase,
    subscriptionHydrated,
    onEnabled,
    onClose,
    onSubscriptionUnlocked,
    devPostSyncPreviewNonce,
    desktopWebUrl: CHINOTTO_DESKTOP_WEB_URL,
  });

  useEffect(() => {
    if (!__DEV__ || !visible) {
      return;
    }
    const selectedPlan = paywallPlans.find((p) => p.kind === selectedPackageKind);
    const showEnableFlow = authPhase === 'signed_out';
    const showSubscriptionWait =
      showEnableFlow && isPaywallEnabled() && !subscriptionHydrated;
    const showPlusPaywall =
      showEnableFlow && isPaywallEnabled() && subscriptionHydrated && !getCachedHasSyncEntitlement();
    console.log('[EnableSyncModal][paywall-gate]', {
      ...getPaywallDebugInfo(),
      authPhase,
      subscriptionHydrated,
      hasSyncEntitlement: getCachedHasSyncEntitlement(),
      /** If any is true, paywall is skipped. Clear AsyncStorage keys or reinstall to reset local flags. */
      syncEntitlementSources: getSyncEntitlementSourcesDebug(),
      showEnableFlow,
      showSubscriptionWait,
      showPlusPaywall,
      selectedPackageKind,
      selectedPlanMeta:
        selectedPlan == null
          ? null
          : {
              kind: selectedPlan.kind,
              storeProductId: selectedPlan.storeProductId,
              priceString: selectedPlan.priceString,
              introPriceString: selectedPlan.introPriceString,
              introCycles: selectedPlan.introCycles,
              introPeriodUnit: selectedPlan.introPeriodUnit,
              introIsFreeTrial: selectedPlan.introIsFreeTrial,
              introTrialEligibleUndisclosed: selectedPlan.introTrialEligibleUndisclosed,
            },
    });
  }, [visible, authPhase, subscriptionHydrated, paywallPlans, selectedPackageKind]);

  const handleClose = useCallback(() => {
    if (!busy) {
      onClose();
    }
  }, [busy, onClose]);

  if (Platform.OS !== 'ios') {
    return null;
  }

  const showEnableFlow = authPhase === 'signed_out';
  const showSubscriptionWait =
    showEnableFlow && isPaywallEnabled() && !subscriptionHydrated;
  const showPlusPaywall =
    showEnableFlow && isPaywallEnabled() && subscriptionHydrated && !getCachedHasSyncEntitlement();
  const selectedPlan = paywallPlans.find((p) => p.kind === selectedPackageKind);
  const trialMessage = useMemo(() => {
    if (selectedPlan == null) {
      return null;
    }
    if (selectedPlan.introTrialEligibleUndisclosed === true) {
      return 'Includes a free trial. Apple shows the exact terms before you confirm.';
    }
    const hasTrial = selectedPlan.introIsFreeTrial === true && selectedPlan.introCycles != null;
    if (!hasTrial) {
      return null;
    }
    const cycles = selectedPlan.introCycles ?? 0;
    const rawUnit = (selectedPlan.introPeriodUnit ?? '').toLowerCase();
    const unit = rawUnit.endsWith('s') ? rawUnit.slice(0, -1) : rawUnit;
    if (cycles <= 0 || unit === '') {
      return null;
    }
    const days = unit === 'day' ? cycles : null;
    const weeks = unit === 'week' ? cycles : null;
    if (days != null) {
      return `Try it free for ${days} day${days === 1 ? '' : 's'}.`;
    }
    if (weeks != null) {
      return `Try it free for ${weeks} week${weeks === 1 ? '' : 's'}.`;
    }
    return `Try it free for ${cycles} ${unit}${cycles === 1 ? '' : 's'}.`;
  }, [selectedPlan]);
  const renewalMessage = useMemo(() => {
    if (selectedPlan?.priceString == null) {
      return null;
    }
    if (selectedPlan.kind === 'monthly') {
      return `Then ${selectedPlan.priceString}/month.`;
    }
    return null;
  }, [selectedPlan]);
  const showSyncTitle =
    !postSyncSuccess &&
    (authPhase !== 'signed_out' || (!showPlusPaywall && !showSubscriptionWait));

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <Pressable
        testID="enable-sync-modal-backdrop"
        accessibilityLabel="Dismiss"
        accessibilityRole="button"
        style={[styles.backdrop, showPlusPaywall && styles.backdropSoft]}
        onPress={handleClose}
        disabled={busy}
      >
        <Pressable
          style={[styles.sheet, { backgroundColor: bgElevated, borderColor: border }]}
          onPress={(ev) => ev.stopPropagation()}
        >
          {postSyncSuccess ? (
            <>
              <Text
                style={[styles.successTitle, { color: fg, fontFamily: fonts.medium }]}
                accessibilityRole="header"
              >
                Sync enabled
              </Text>
              <Text style={[styles.body, { color: fgDim, fontFamily: fonts.regular }]}>
                Your thoughts will stay with you across devices.
              </Text>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Continue on desktop, copies link to clipboard"
                accessibilityHint={`Copies ${CHINOTTO_DESKTOP_WEB_URL}`}
                disabled={busy}
                onPress={() => void handleCopyDesktopLink()}
                style={({ pressed }) => [styles.desktopLinkWrap, { opacity: pressed ? 0.72 : 1 }]}
              >
                <Text
                  style={[
                    styles.desktopLinkText,
                    { color: fg, fontFamily: fonts.regular, textDecorationColor: fg },
                  ]}
                >
                  Continue on desktop.
                </Text>
              </Pressable>
              {desktopLinkCopied ? (
                <Text
                  style={[styles.copiedHint, { color: muted, fontFamily: fonts.regular }]}
                  accessibilityLiveRegion="polite"
                >
                  Copied
                </Text>
              ) : null}
            </>
          ) : null}

          {!postSyncSuccess && showSyncTitle ? (
            <Text style={[styles.title, { color: fg, fontFamily: fonts.medium }]}>Sync</Text>
          ) : null}

          {!postSyncSuccess && authPhase === 'restoring' ? (
            <>
              <Text style={[styles.body, { color: fgDim, fontFamily: fonts.regular }]}>
                Checking sign-in…
              </Text>
              <ActivityIndicator style={styles.spinner} color={fg} />
            </>
          ) : null}

          {!postSyncSuccess && authPhase === 'signed_in' ? (
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

          {!postSyncSuccess && showEnableFlow && showSubscriptionWait ? (
            <>
              <Text style={[styles.body, { color: fgDim, fontFamily: fonts.regular }]}>
                One moment…
              </Text>
              <ActivityIndicator style={styles.spinner} color={fg} />
            </>
          ) : !postSyncSuccess && showEnableFlow && showPlusPaywall ? (
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
                Everything stays local by default. Sync is optional.
              </Text>
              {paywallPlansLoading ? (
                <ActivityIndicator style={styles.paywallPlansSpinner} color={fg} />
              ) : null}
              <View style={styles.planRow} accessibilityRole="radiogroup" accessibilityLabel="Sync plan">
                {CHINOTTO_PACKAGE_KIND_ORDER.map((kind) => {
                  const selected = selectedPackageKind === kind;
                  const label =
                    kind === 'monthly' ? 'Monthly' : kind === 'yearly' ? 'Yearly' : 'Lifetime';
                  const price = paywallPlans.find((p) => p.kind === kind)?.priceString;
                  const a11yLabel = price != null ? `${label}, ${price}` : `${label} plan`;
                  return (
                    <Pressable
                      key={kind}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={a11yLabel}
                      disabled={busy}
                      onPress={() => setSelectedPackageKind(kind)}
                      style={({ pressed }) => [
                        styles.planChip,
                        {
                          borderColor: selected ? fg : border,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.planChipLabel,
                          { color: selected ? fg : fgDim, fontFamily: fonts.regular },
                        ]}
                      >
                        {label}
                      </Text>
                      {price != null ? (
                        <Text
                          style={[styles.planChipPrice, { color: muted, fontFamily: fonts.regular }]}
                          numberOfLines={1}
                        >
                          {price}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
              <Text style={[styles.paywallFooter, { color: muted, fontFamily: fonts.regular }]}>
                {trialMessage ?? 'Optional paid layer. Manage or cancel in Apple Account settings.'}
              </Text>
              {renewalMessage != null ? (
                <Text style={[styles.paywallSubtle, { color: muted, fontFamily: fonts.regular }]}>
                  {renewalMessage}
                </Text>
              ) : null}
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
                accessibilityLabel="Continue with selected plan"
                disabled={busy}
                style={({ pressed }) => [
                  styles.appleButton,
                  styles.paywallPrimaryButton,
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
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Restore purchases"
                disabled={busy}
                onPress={() => void handleRestorePurchases()}
                style={styles.restorePurchases}
              >
                <Text style={{ color: fgDim, fontFamily: fonts.regular, fontSize: 15 }}>
                  Restore purchases
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Not now"
                disabled={busy}
                onPress={handleClose}
                style={styles.later}
              >
                <Text style={{ color: muted, fontFamily: fonts.regular }}>Not now</Text>
              </Pressable>
            </>
          ) : !postSyncSuccess && showEnableFlow ? (
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
          ) : !postSyncSuccess && authPhase === 'signed_in' ? (
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
          ) : !postSyncSuccess ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Done"
              disabled={busy}
              onPress={handleClose}
              style={({ pressed }) => [styles.doneButton, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={{ color: fg, fontFamily: fonts.medium, fontSize: 16 }}>Done</Text>
            </Pressable>
          ) : null}
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
  backdropSoft: {
    backgroundColor: 'rgba(0,0,0,0.32)',
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
  successTitle: {
    fontSize: 20,
    lineHeight: 26,
    marginBottom: spacing.sm,
  },
  desktopLinkWrap: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingVertical: 4,
  },
  desktopLinkText: {
    fontSize: 16,
    lineHeight: 22,
    textDecorationLine: 'underline',
  },
  copiedHint: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.xs,
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
  planRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  planChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  planChipLabel: {
    fontSize: 15,
    lineHeight: 20,
  },
  planChipPrice: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  paywallPlansSpinner: {
    marginBottom: spacing.sm,
  },
  restorePurchases: {
    marginTop: spacing.sm,
    alignSelf: 'center',
    paddingVertical: spacing.xs,
  },
  paywallFooter: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  paywallSubtle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  paywallPrimaryButton: {
    marginTop: spacing.xs,
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
