import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import Purchases, { type CustomerInfo, type PurchasesOfferings } from 'react-native-purchases';

import { isFirebaseSyncConfigured } from '../sync/firebaseConfig';
import { isAndroidSyncPlatform } from '../auth/syncPlatform';
import { getPaywallDebugInfo, isPaywallEnabled } from '../monetization/paywallConfig';
import { getCachedHasSyncEntitlement, getSyncEntitlementSourcesDebug } from '../monetization/subscriptionState';
import {
  CHINOTTO_PACKAGE_KIND_ORDER,
  REVENUECAT_IOS_API_KEY,
} from '../src/services/purchases/constants';
import { fonts, radius, screenContentGutter, spacing, useAppTheme } from '../theme';
import { useEnableSyncController } from './useEnableSyncController';

/**
 * TEMPORARY — delete this constant, `buildTempRcOfferingsDebugText`, the related state/effect/styles,
 * and the paywall `ScrollView` block when the paywall is stable. Used to diagnose “plans unavailable” locally.
 *
 * **Never in release:** {@link SHOW_RC_OFFERINGS_DEBUG_UI} is `__DEV__ &&` this flag so TestFlight/App Store
 * builds never show the panel or run the extra RC fetch, even if this is set to `true` by mistake.
 */
const TEMP_RC_OFFERINGS_DEBUG_UI = false;

const SHOW_RC_OFFERINGS_DEBUG_UI = __DEV__ && TEMP_RC_OFFERINGS_DEBUG_UI;

/** TEMPORARY — remove with {@link TEMP_RC_OFFERINGS_DEBUG_UI}. No full key, only shape / EAS hint. */
function tempRcEmbeddedIosKeyHint(): string {
  const k = REVENUECAT_IOS_API_KEY;
  if (k == null || k.trim() === '') {
    return 'embedded iOS SDK key: EMPTY — set EXPO_PUBLIC_REVENUECAT_IOS_API_KEY on the EAS build profile';
  }
  if (k.startsWith('test_')) {
    return 'embedded iOS SDK key: starts with test_* — typical when EAS built without EXPO_PUBLIC_REVENUECAT_IOS_API_KEY (TestFlight needs public appl_* from RevenueCat)';
  }
  if (k.startsWith('appl_')) {
    return 'embedded iOS SDK key: appl_* (public iOS shape). If SDK still errors, check RevenueCat ↔ bundle id ↔ App Store Connect link (see https://rev.cat/sdk-troubleshooting )';
  }
  return `embedded iOS SDK key: unexpected prefix "${k.slice(0, 6)}…" (expected appl_ for App Store)`;
}

/** TEMPORARY — remove with {@link TEMP_RC_OFFERINGS_DEBUG_UI}. */
function tempRcThrownErrorDetail(e: unknown): string {
  const base = e instanceof Error ? e.message : String(e);
  if (e !== null && typeof e === 'object') {
    const rec = e as Record<string, unknown>;
    const code = rec.code;
    const underlying = rec.underlyingErrorMessage ?? rec.readableErrorCode;
    const extra =
      code != null || underlying != null
        ? `\ncode: ${code != null ? String(code) : '—'}\nunderlying: ${underlying != null ? String(underlying) : '—'}`
        : '';
    return `${base}${extra}`;
  }
  return base;
}

function buildTempRcOfferingsDebugText(
  offerings: PurchasesOfferings,
  customerInfo: CustomerInfo,
): string {
  const lines: string[] = ['[TEMP RC DEBUG]', ''];
  const allKeys = offerings.all != null ? Object.keys(offerings.all) : [];
  lines.push(
    `all offering ids (${allKeys.length}): ${allKeys.length > 0 ? allKeys.join(', ') : '(none — offerings empty)'}`,
  );
  const cur = offerings.current;
  if (cur == null) {
    lines.push('current offering: NONE (empty — often explains missing plan prices)', '');
  } else {
    lines.push(`current offering id: ${cur.identifier}`);
    const pkgs = cur.availablePackages ?? [];
    if (pkgs.length === 0) {
      lines.push('availablePackages: (empty)', '');
    } else {
      lines.push('packages:');
      for (const p of pkgs) {
        const pid =
          typeof p.product?.identifier === 'string' && p.product.identifier !== ''
            ? p.product.identifier
            : '(no product identifier)';
        lines.push(`  • ${p.identifier} → ${pid}`);
      }
      lines.push('');
    }
  }
  lines.push('— customerInfo —');
  lines.push(`originalAppUserId: ${customerInfo.originalAppUserId}`);
  lines.push(`activeSubscriptions: ${JSON.stringify([...customerInfo.activeSubscriptions])}`);
  lines.push(
    `entitlements.active: ${JSON.stringify(Object.keys(customerInfo.entitlements.active))}`,
  );
  return lines.join('\n');
}

/** Web app URL for “continue on desktop” (replace when a dedicated download page exists). */
export const CHINOTTO_DESKTOP_WEB_URL = 'https://getchinotto.app/';
const APPLE_STANDARD_EULA_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const CHINOTTO_PRIVACY_POLICY_URL = 'https://getchinotto.app/privacy';

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
  const { width: windowWidth } = useWindowDimensions();
  const backdropInset = screenContentGutter(windowWidth);
  const { sunlightMode } = useAppTheme();
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
    handleGoogle,
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

  /** TEMPORARY — remove with {@link TEMP_RC_OFFERINGS_DEBUG_UI}. */
  const [rcDebugLoading, setRcDebugLoading] = useState(false);
  /** TEMPORARY — remove with {@link TEMP_RC_OFFERINGS_DEBUG_UI}. */
  const [rcDebugText, setRcDebugText] = useState<string | null>(null);

  useEffect(() => {
    if (!SHOW_RC_OFFERINGS_DEBUG_UI || Platform.OS !== 'ios') {
      return;
    }
    const showPlusPaywallDebug =
      authPhase === 'signed_out' &&
      isPaywallEnabled() &&
      subscriptionHydrated &&
      !getCachedHasSyncEntitlement();
    if (!visible || !showPlusPaywallDebug) {
      setRcDebugText(null);
      setRcDebugLoading(false);
      return;
    }
    let cancelled = false;
    setRcDebugLoading(true);
    setRcDebugText(null);
    void (async () => {
      try {
        const [offerings, customerInfo] = await Promise.all([
          Purchases.getOfferings(),
          Purchases.getCustomerInfo(),
        ]);
        if (cancelled) {
          return;
        }
        const text =
          `${buildTempRcOfferingsDebugText(offerings, customerInfo)}\n\nbuild: ${__DEV__ ? 'dev' : 'release'}\n${tempRcEmbeddedIosKeyHint()}`;
        console.log('[EnableSyncModal][TEMP RC DEBUG]', { offerings, customerInfo });
        setRcDebugText(text);
      } catch (e: unknown) {
        if (cancelled) {
          return;
        }
        const msg = tempRcThrownErrorDetail(e);
        console.log('[EnableSyncModal][TEMP RC DEBUG] error', e);
        setRcDebugText(
          `[TEMP RC DEBUG]\n\ngetOfferings/getCustomerInfo threw:\n${msg}\n\nbuild: ${__DEV__ ? 'dev' : 'release'}\n${tempRcEmbeddedIosKeyHint()}`,
        );
      } finally {
        if (!cancelled) {
          setRcDebugLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, authPhase, subscriptionHydrated]);

  const handleClose = useCallback(() => {
    if (!busy) {
      onClose();
    }
  }, [busy, onClose]);

  const openLegalUrl = useCallback((url: string) => {
    void Linking.openURL(url).catch((err) => {
      if (__DEV__) {
        console.warn('open legal url failed', err);
      }
    });
  }, []);

  const useGooglePrimary = isAndroidSyncPlatform();

  const showEnableFlow = authPhase === 'signed_out';
  const showSubscriptionWait =
    showEnableFlow && isPaywallEnabled() && !subscriptionHydrated;
  const showPlusPaywall =
    showEnableFlow &&
    isPaywallEnabled() &&
    subscriptionHydrated &&
    !getCachedHasSyncEntitlement();
  const monthlyTrialHint = useMemo(() => {
    const monthlyPlan = paywallPlans.find((p) => p.kind === 'monthly');
    if (monthlyPlan == null) {
      return null;
    }
    if (monthlyPlan.introTrialEligibleUndisclosed === true) {
      return 'Free trial available';
    }
    const hasTrial = monthlyPlan.introIsFreeTrial === true && monthlyPlan.introCycles != null;
    if (!hasTrial) {
      return null;
    }
    const cycles = monthlyPlan.introCycles ?? 0;
    const rawUnit = (monthlyPlan.introPeriodUnit ?? '').toLowerCase();
    const unit = rawUnit.endsWith('s') ? rawUnit.slice(0, -1) : rawUnit;
    if (cycles <= 0 || unit === '') {
      return 'Monthly includes a free trial.';
    }
    const days = unit === 'day' ? cycles : null;
    const weeks = unit === 'week' ? cycles : null;
    if (days != null) {
      return `${days}-day free trial`;
    }
    if (weeks != null) {
      return `${weeks}-week free trial`;
    }
    return `${cycles}-${unit} free trial`;
  }, [paywallPlans]);
  const showSyncTitle =
    !postSyncSuccess &&
    (authPhase !== 'signed_out' || (!showPlusPaywall && !showSubscriptionWait));
  const interactionLocked = busy;

  const sheetShadowLift = sunlightMode
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

  const paywallPrimaryShadowLift = sunlightMode
    ? Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
        },
        android: { elevation: 2 },
        default: {},
      }) ?? {}
    : {};

  if (!isFirebaseSyncConfigured()) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <Pressable
        testID="enable-sync-modal-backdrop"
        accessibilityLabel="Dismiss"
        accessibilityRole="button"
        style={[
          styles.backdrop,
          { paddingHorizontal: backdropInset },
          showPlusPaywall && styles.backdropSoft,
        ]}
        onPress={handleClose}
        disabled={busy}
      >
        <Pressable
          style={[
            styles.sheet,
            sheetShadowLift,
            {
              backgroundColor: sunlightMode ? bgElevated : 'rgba(18, 18, 26, 0.9)',
              borderColor: border,
            },
          ]}
          onPress={(ev) => ev.stopPropagation()}
        >
          {sunlightMode ? null : (
            <>
              <View pointerEvents="none" style={styles.sheetAuraViolet} />
              <View pointerEvents="none" style={styles.sheetAuraBlue} />
            </>
          )}
          <View
            pointerEvents="none"
            style={[
              styles.sheetInnerRing,
              sunlightMode ? { borderColor: 'rgba(255,255,255,0.22)' } : null,
            ]}
          />
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
                disabled={interactionLocked}
                onPress={() => void handleCopyDesktopLink()}
                style={({ pressed }) => [styles.desktopLinkWrap, { opacity: pressed ? 0.72 : 1 }]}
              >
                <Text style={[styles.desktopLinkRow, { color: fg, fontFamily: fonts.regular }]}>
                  <Text
                    style={[
                      styles.desktopLinkUnderline,
                      { color: fg, textDecorationColor: fg, fontFamily: fonts.regular },
                    ]}
                  >
                    Continue on desktop.
                  </Text>
                  {desktopLinkCopied ? (
                    <Text
                      style={[styles.copiedInline, { color: muted, fontFamily: fonts.regular }]}
                      accessibilityLiveRegion="polite"
                    >
                      {' '}
                      Copied
                    </Text>
                  ) : null}
                </Text>
              </Pressable>
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
                If you also use Chinotto on another device, older thoughts from there load in the background.
                The stream shows recent items first.
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
              <Text
                style={[styles.paywallTitle, { color: fg, fontFamily: fonts.medium }]}
                accessibilityRole="header"
              >
                Continue on another device
              </Text>
              <Text style={[styles.body, { color: fgDim, fontFamily: fonts.regular }]}>
                Local by default. Sync is optional.
              </Text>
              {SHOW_RC_OFFERINGS_DEBUG_UI ? (
                <View
                  testID="temp-rc-offerings-debug"
                  style={[styles.tempRcDebugWrap, { borderColor: 'rgba(255, 159, 67, 0.55)' }]}
                >
                  <Text
                    style={[styles.tempRcDebugBanner, { color: 'rgb(255, 179, 102)' }]}
                    accessibilityLabel="Temporary RevenueCat debug"
                  >
                    TEMP: RevenueCat debug (remove before release)
                  </Text>
                  {rcDebugLoading ? (
                    <Text style={[styles.tempRcDebugBody, { color: fgDim, fontFamily: fonts.regular }]}>
                      Loading Purchases.getOfferings / getCustomerInfo…
                    </Text>
                  ) : rcDebugText != null ? (
                    <ScrollView
                      style={styles.tempRcDebugScroll}
                      nestedScrollEnabled
                      keyboardShouldPersistTaps="handled"
                    >
                      <Text
                        selectable
                        style={[styles.tempRcDebugBody, { color: fgDim, fontFamily: fonts.regular }]}
                      >
                        {rcDebugText}
                      </Text>
                    </ScrollView>
                  ) : null}
                </View>
              ) : null}
              {paywallPlansLoading ? (
                <ActivityIndicator style={styles.paywallPlansSpinner} color={fg} />
              ) : null}
              <View style={styles.planList} accessibilityRole="radiogroup" accessibilityLabel="Sync plan">
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
                      disabled={interactionLocked}
                      onPress={() => setSelectedPackageKind(kind)}
                      style={({ pressed }) => [
                        styles.planOption,
                        {
                          borderColor: selected ? 'rgba(138,148,200,0.36)' : border,
                          backgroundColor: selected ? 'rgba(128,138,188,0.08)' : 'transparent',
                          opacity: pressed ? 0.9 : 1,
                        },
                      ]}
                    >
                      <View style={styles.planOptionLeft}>
                        <View>
                          <Text
                            style={[
                              styles.planOptionLabel,
                              { color: selected ? fg : fgDim, fontFamily: fonts.regular },
                            ]}
                          >
                            {label}
                          </Text>
                          {kind === 'monthly' && monthlyTrialHint != null ? (
                            <Text
                              style={[
                                styles.planOptionHint,
                                { color: muted, fontFamily: fonts.regular },
                              ]}
                              numberOfLines={1}
                            >
                              {monthlyTrialHint}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      <View style={styles.planOptionRight}>
                        {price != null ? (
                          <Text
                            style={[
                              styles.planOptionPrice,
                              { color: selected ? fgDim : muted, fontFamily: fonts.regular },
                            ]}
                            numberOfLines={1}
                          >
                            {price}
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
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
                accessibilityLabel="Enable sync with selected plan"
                disabled={interactionLocked}
                style={({ pressed }) => [
                  styles.appleButton,
                  styles.paywallPrimaryButton,
                  paywallPrimaryShadowLift,
                  { opacity: busy ? 0.5 : pressed ? 0.88 : 1 },
                ]}
                onPress={() => void handlePlusContinue()}
              >
                {busy ? (
                  <ActivityIndicator color={fg} />
                ) : (
                  <Text style={[styles.appleLabel, { color: fg, fontFamily: fonts.medium }]}>
                    Enable sync
                  </Text>
                )}
              </Pressable>
              <View style={styles.legalWrap}>
                <Text style={[styles.legalIntro, { color: muted, fontFamily: fonts.regular }]}>
                  By continuing, you agree to:
                </Text>
                <View style={styles.legalRow}>
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel="Open Terms of Use"
                    hitSlop={8}
                    onPress={() => openLegalUrl(APPLE_STANDARD_EULA_URL)}
                  >
                    <Text style={[styles.legalLink, { color: muted, fontFamily: fonts.regular }]}>
                      Terms of Use
                    </Text>
                  </Pressable>
                  <Text style={[styles.legalDot, { color: muted, fontFamily: fonts.regular }]}>•</Text>
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel="Open Privacy Policy"
                    hitSlop={8}
                    onPress={() => openLegalUrl(CHINOTTO_PRIVACY_POLICY_URL)}
                  >
                    <Text style={[styles.legalLink, { color: muted, fontFamily: fonts.regular }]}>
                      Privacy Policy
                    </Text>
                  </Pressable>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Restore purchases"
                disabled={interactionLocked}
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
                {useGooglePrimary
                  ? 'Use Google to connect your devices.'
                  : 'Use Apple to connect your devices.'}
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
                testID={useGooglePrimary ? 'enable-sync-continue-with-google' : 'enable-sync-continue-with-apple'}
                accessibilityRole="button"
                accessibilityLabel={useGooglePrimary ? 'Continue with Google' : 'Continue with Apple'}
                disabled={interactionLocked}
                style={({ pressed }) => [
                  styles.appleButton,
                  {
                    backgroundColor: fg,
                    opacity: busy ? 0.5 : pressed ? 0.88 : 1,
                  },
                ]}
                onPress={() => void (useGooglePrimary ? handleGoogle() : handleApple())}
              >
                {busy ? (
                  <ActivityIndicator color={bgElevated} />
                ) : (
                  <Text style={[styles.appleLabel, { color: bgElevated, fontFamily: fonts.medium }]}>
                    {useGooglePrimary ? 'Continue with Google' : 'Continue with Apple'}
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
                disabled={interactionLocked}
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
    backgroundColor: 'rgba(0,0,0,0.54)',
    justifyContent: 'center',
  },
  backdropSoft: {
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  sheet: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
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
  /** Single line with optional inline “Copied” avoids layout jump from a second row. */
  desktopLinkRow: {
    fontSize: 16,
    lineHeight: 22,
  },
  desktopLinkUnderline: {
    textDecorationLine: 'underline',
  },
  copiedInline: {
    fontSize: 13,
    lineHeight: 22,
    textDecorationLine: 'none',
  },
  paywallTitle: {
    fontSize: 21,
    lineHeight: 28,
    marginBottom: spacing.sm,
  },
  /** TEMPORARY — remove with {@link TEMP_RC_OFFERINGS_DEBUG_UI}. */
  tempRcDebugWrap: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 120, 40, 0.08)',
    maxHeight: 168,
  },
  tempRcDebugBanner: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  tempRcDebugScroll: {
    maxHeight: 120,
  },
  tempRcDebugBody: {
    fontSize: 11,
    lineHeight: 15,
  },
  planList: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  planOption: {
    minHeight: 50,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  planOptionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    marginLeft: spacing.sm,
  },
  planOptionLabel: {
    fontSize: 15,
    lineHeight: 20,
  },
  planOptionHint: {
    marginTop: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  planOptionPrice: {
    fontSize: 13,
    lineHeight: 18,
  },
  paywallPlansSpinner: {
    marginBottom: spacing.sm,
  },
  restorePurchases: {
    marginTop: spacing.sm,
    alignSelf: 'center',
    paddingVertical: spacing.xs,
  },
  paywallPrimaryButton: {
    marginTop: spacing.xs,
    backgroundColor: 'rgba(160,170,255,0.22)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(160,170,255,0.36)',
    borderTopColor: 'rgba(188,196,255,0.52)',
    shadowColor: '#a0aaff',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  legalWrap: {
    marginTop: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  legalIntro: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legalLink: {
    fontSize: 11,
    lineHeight: 14,
    textDecorationLine: 'underline',
  },
  legalDot: {
    fontSize: 11,
    lineHeight: 14,
    marginHorizontal: 6,
    opacity: 0.72,
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
    borderRadius: radius.md,
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
