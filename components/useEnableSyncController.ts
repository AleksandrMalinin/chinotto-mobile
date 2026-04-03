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

import type { SyncModalAuthPhase } from './EnableSyncModal';

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
    if (!visible) {
      setPostSyncSuccess(false);
      setDesktopLinkCopied(false);
      setSelectedPackageKind('yearly');
      setPaywallPlans([]);
      setPaywallPlansLoading(false);
      if (copyFeedbackTimerRef.current) {
        clearTimeout(copyFeedbackTimerRef.current);
        copyFeedbackTimerRef.current = null;
      }
    }
  }, [visible]);

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
    try {
      const result = await openSyncPurchaseFlow({
        packageKind: selectedPackageKind,
        ...(paywallPlans.length > 0 ? { preloadedPackages: paywallPlans } : {}),
      });
      switch (result.kind) {
        case 'already_has_sync_access':
          onSubscriptionUnlocked?.();
          void mirrorChinottoSyncAccessToFirestore();
          break;
        case 'purchased':
          onSubscriptionUnlocked?.();
          void mirrorChinottoSyncAccessToFirestore();
          if (!getCachedHasSyncEntitlement()) {
            setErrorMessage(
              'Apple shows an active subscription, but this app has not received sync access yet. In RevenueCat, attach each product to the entitlement Chinotto Pro, then tap Restore purchases. After that, Continue will take you to Sign in with Apple.'
            );
          }
          break;
        case 'cancelled':
          break;
        case 'unavailable':
          setErrorMessage('Plans are not available right now. Try again later.');
          break;
        case 'failed':
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
    try {
      const info = await restorePurchases();
      if (__DEV__) {
        void logRevenueCatSubscriptionsAndProducts(info ?? undefined, 'after-restore');
      }
      if (getCachedHasSyncEntitlement()) {
        onSubscriptionUnlocked?.();
        void mirrorChinottoSyncAccessToFirestore();
        return;
      }
      if (info != null) {
        setErrorMessage('No purchases found for this Apple ID.');
      } else {
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
      await mirrorChinottoSyncAccessToFirestore();
      onEnabled();
      setPostSyncSuccess(true);
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
  }, [onEnabled]);

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
