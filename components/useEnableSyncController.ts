import { signOut } from 'firebase/auth';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useRef, useState } from 'react';

import { AppleSyncIdentityError } from '../auth/appleFirebaseAuth';
import { AppleUserCanceledError, enableAppleSyncWithFirebase } from '../auth/enableAppleSync';
import { isPaywallEnabled } from '../monetization/paywallConfig';
import { openSyncPurchaseFlow } from '../monetization/syncPurchaseFlow';
import { getCachedHasSyncEntitlement } from '../monetization/subscriptionState';
import {
  type ChinottoPackageKind,
} from '../src/services/purchases/constants';
import type { ChinottoPaywallPackage } from '../src/services/purchases/offerings';
import { loadCurrentChinottoOffering } from '../src/services/purchases/offerings';
import { logRevenueCatSubscriptionsAndProducts } from '../src/services/purchases/revenueCatDebugLog';
import { restorePurchases } from '../src/services/purchases/revenueCat';
import { getOrInitAuth } from '../sync/firebaseAuth';
import { resolvePushEntryForSync } from '../sync/pushEntryForSync';
import { processSyncQueue } from '../sync/syncEngine';
import { mirrorChinottoSyncAccessToFirestore } from '../sync/firestoreSyncAccessMirror';
import { flushSyncTombstoneOutbox } from '../sync/tombstoneFlush';
import { backfillLocalThemesToRemote } from '../sync/themeSyncBackfill';
import { flushSyncUserThemeOutbox } from '../sync/userThemeFlush';
import { track } from '../analytics/analytics';

import type { SyncModalAuthPhase } from './EnableSyncModal';

function purchaseFailureKind(err: Error): 'user_cancelled' | 'network' | 'unknown' {
  const rec = err as { code?: string };
  const code = typeof rec.code === 'string' ? rec.code : '';
  if (code === 'PURCHASE_CANCELLED' || /cancel/i.test(err.message)) {
    return 'user_cancelled';
  }
  if (code === 'NETWORK_ERROR' || /network|offline|internet|connection/i.test(err.message)) {
    return 'network';
  }
  return 'unknown';
}

export function useEnableSyncController(params: {
  visible: boolean;
  authPhase: SyncModalAuthPhase;
  subscriptionHydrated: boolean;
  onEnabled: () => void;
  onClose: () => void;
  onSubscriptionUnlocked?: () => void;
  devPostSyncPreviewNonce?: number;
  desktopWebUrl: string;
}): {
  busy: boolean;
  errorMessage: string | null;
  selectedPackageKind: ChinottoPackageKind;
  setSelectedPackageKind: (kind: ChinottoPackageKind) => void;
  paywallPlans: ChinottoPaywallPackage[];
  paywallPlansLoading: boolean;
  postSyncSuccess: boolean;
  desktopLinkCopied: boolean;
  handleCopyDesktopLink: () => Promise<void>;
  handlePlusContinue: () => Promise<void>;
  handleRestorePurchases: () => Promise<void>;
  handleApple: () => Promise<void>;
  handleStopSyncing: () => Promise<void>;
} {
  const {
    visible,
    authPhase,
    subscriptionHydrated,
    onEnabled,
    onClose,
    onSubscriptionUnlocked,
    devPostSyncPreviewNonce,
    desktopWebUrl,
  } = params;

  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedPackageKind, setSelectedPackageKind] = useState<ChinottoPackageKind>('yearly');
  const [paywallPlans, setPaywallPlans] = useState<ChinottoPaywallPackage[]>([]);
  const [paywallPlansLoading, setPaywallPlansLoading] = useState(false);
  const [postSyncSuccess, setPostSyncSuccess] = useState(false);
  const [desktopLinkCopied, setDesktopLinkCopied] = useState(false);
  const copyFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDevPostSyncNonce = useRef(0);
  const paywallShownForOpenRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      if (copyFeedbackTimerRef.current) {
        clearTimeout(copyFeedbackTimerRef.current);
        copyFeedbackTimerRef.current = null;
      }
      return;
    }
    // Reset on open only. Clearing layout-driving state when `visible` flips false runs while the
    // Modal fade-out is still visible and makes the sheet height jump; defer reset to the next open.
    paywallShownForOpenRef.current = false;
    setPostSyncSuccess(false);
    setDesktopLinkCopied(false);
    setSelectedPackageKind('yearly');
    setPaywallPlans([]);
    setPaywallPlansLoading(false);
    setErrorMessage(null);
    setBusy(false);
  }, [visible]);

  useEffect(() => {
    if (!__DEV__) {
      return;
    }
    const n = devPostSyncPreviewNonce;
    if (n == null || n <= 0 || !visible) {
      return;
    }
    if (n === lastDevPostSyncNonce.current) {
      return;
    }
    lastDevPostSyncNonce.current = n;
    setPostSyncSuccess(true);
  }, [visible, devPostSyncPreviewNonce]);

  useEffect(() => {
    if (!visible || !isPaywallEnabled() || !subscriptionHydrated || authPhase !== 'signed_out') {
      return;
    }
    if (getCachedHasSyncEntitlement()) {
      return;
    }
    if (paywallPlansLoading || paywallPlans.length === 0) {
      return;
    }
    if (paywallShownForOpenRef.current) {
      return;
    }
    paywallShownForOpenRef.current = true;
    track({ event: 'sync_paywall_shown' });
  }, [visible, subscriptionHydrated, authPhase, paywallPlansLoading, paywallPlans.length]);

  useEffect(() => {
    if (!visible || !isPaywallEnabled() || !subscriptionHydrated || authPhase !== 'signed_out') {
      return;
    }
    if (getCachedHasSyncEntitlement()) {
      return;
    }
    let cancelled = false;
    setPaywallPlans([]);
    setPaywallPlansLoading(true);
    void loadCurrentChinottoOffering().then((r) => {
      if (cancelled) {
        return;
      }
      setPaywallPlansLoading(false);
      if (r.ok) {
        setPaywallPlans(r.packages);
      }
      if (__DEV__) {
        const label = r.ok ? 'enable-sync-paywall' : 'enable-sync-paywall (offering unavailable)';
        void logRevenueCatSubscriptionsAndProducts(undefined, label);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [visible, subscriptionHydrated, authPhase]);

  const handleCopyDesktopLink = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(desktopWebUrl);
      setDesktopLinkCopied(true);
      if (copyFeedbackTimerRef.current) {
        clearTimeout(copyFeedbackTimerRef.current);
      }
      copyFeedbackTimerRef.current = setTimeout(() => {
        copyFeedbackTimerRef.current = null;
        setDesktopLinkCopied(false);
      }, 2000);
    } catch {
      /* ignore */
    }
  }, [desktopWebUrl]);

  const handlePlusContinue = useCallback(async () => {
    setErrorMessage(null);
    setBusy(true);
    track({ event: 'sync_plus_continue_clicked', package_kind: selectedPackageKind });
    try {
      const result = await openSyncPurchaseFlow({
        packageKind: selectedPackageKind,
        ...(paywallPlans.length > 0 ? { preloadedPackages: paywallPlans } : {}),
      });
      if (__DEV__) {
        console.log('[EnableSync] purchase flow result:', result.kind);
      }
      switch (result.kind) {
        case 'already_has_sync_access':
          track({ event: 'sync_purchase_outcome', outcome: 'already_has_sync_access' });
          onSubscriptionUnlocked?.();
          void mirrorChinottoSyncAccessToFirestore();
          break;
        case 'purchased':
          track({ event: 'sync_purchase_outcome', outcome: 'purchased' });
          onSubscriptionUnlocked?.();
          void mirrorChinottoSyncAccessToFirestore();
          break;
        case 'purchased_without_entitlement':
          track({ event: 'sync_purchase_outcome', outcome: 'purchased_without_entitlement' });
          onSubscriptionUnlocked?.();
          void mirrorChinottoSyncAccessToFirestore();
          setErrorMessage(
            'Sync access is not active yet. Tap Restore purchases once, then Continue again. If this persists, in RevenueCat attach each product to the entitlement Chinotto Pro (exact name).'
          );
          break;
        case 'cancelled':
          track({ event: 'sync_purchase_outcome', outcome: 'cancelled' });
          setErrorMessage(
            'Purchase did not finish (Apple returned cancel). Try Enable sync again, or Restore purchases if you already subscribed.'
          );
          break;
        case 'unavailable':
          track({ event: 'sync_purchase_outcome', outcome: 'unavailable' });
          setErrorMessage('Plans are not available right now. Try again later.');
          break;
        case 'failed':
          track({
            event: 'sync_purchase_outcome',
            outcome: 'failed',
            failure_kind: purchaseFailureKind(result.error),
          });
          setErrorMessage(result.error.message || 'Something went wrong. Try again.');
          break;
      }
    } finally {
      setBusy(false);
    }
  }, [onSubscriptionUnlocked, selectedPackageKind, paywallPlans]);

  const handleRestorePurchases = useCallback(async () => {
    setErrorMessage(null);
    setBusy(true);
    track({ event: 'sync_restore_tapped' });
    try {
      const info = await restorePurchases();
      if (__DEV__) {
        void logRevenueCatSubscriptionsAndProducts(info ?? undefined, 'after-restore');
      }
      if (getCachedHasSyncEntitlement()) {
        track({ event: 'sync_restore_outcome', outcome: 'entitlement_active' });
        onSubscriptionUnlocked?.();
        void mirrorChinottoSyncAccessToFirestore();
        return;
      }
      if (info != null) {
        track({ event: 'sync_restore_outcome', outcome: 'no_entitlement' });
        setErrorMessage('No purchases found for this Apple ID.');
      } else {
        track({ event: 'sync_restore_outcome', outcome: 'error' });
        setErrorMessage('Could not restore. Check your connection and try again.');
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
      await flushSyncUserThemeOutbox();
      await backfillLocalThemesToRemote();
      await mirrorChinottoSyncAccessToFirestore();
      track({ event: 'sync_apple_mobile_sign_in_outcome', outcome: 'success' });
      onEnabled();
      setPostSyncSuccess(true);
    } catch (err: unknown) {
      if (err instanceof AppleUserCanceledError) {
        track({ event: 'sync_apple_mobile_sign_in_outcome', outcome: 'user_cancelled' });
        // Calm: no error banner for cancel
      } else if (err instanceof AppleSyncIdentityError) {
        track({ event: 'sync_apple_mobile_sign_in_outcome', outcome: 'error' });
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        track({ event: 'sync_apple_mobile_sign_in_outcome', outcome: 'error' });
        setErrorMessage(err.message);
      } else {
        track({ event: 'sync_apple_mobile_sign_in_outcome', outcome: 'error' });
        setErrorMessage('Something went wrong. Try again.');
      }
    } finally {
      setBusy(false);
    }
  }, [onEnabled]);

  const handleStopSyncing = useCallback(async () => {
    setErrorMessage(null);
    setBusy(true);
    track({ event: 'sync_stop_sync_clicked' });
    try {
      await mirrorChinottoSyncAccessToFirestore({ forceInactive: true });
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

  return {
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
  };
}
