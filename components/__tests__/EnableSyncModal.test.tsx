import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

const mockClipboardSetString = jest.fn((_text: string) => Promise.resolve());

jest.mock('expo-clipboard', () => ({
  setStringAsync: (text: string) => mockClipboardSetString(text),
}));

const mockSignOut = jest.fn((_auth?: unknown) => Promise.resolve());
/** Mutable gate for mocked `isPaywallEnabled` / `getPaywallDebugInfo` (same value). */
const paywallGate = { enabled: false };
const mockGetEntitlement = jest.mocked(getCachedHasSyncEntitlement);
const mockOpenSyncPurchaseFlow = jest.mocked(openSyncPurchaseFlow);

jest.mock('firebase/auth', () => ({
  signOut: (auth: unknown) => mockSignOut(auth),
}));

jest.mock('../../sync/firebaseAuth', () => ({
  getOrInitAuth: jest.fn(() => ({ mockAuth: true })),
}));

jest.mock('../../sync/syncEngine', () => ({
  processSyncQueue: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../sync/pushEntryForSync', () => ({
  resolvePushEntryForSync: jest.fn(() => jest.fn()),
}));

jest.mock('../../sync/tombstoneFlush', () => ({
  flushSyncTombstoneOutbox: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../auth/enableAppleSync', () => ({
  enableAppleSyncWithFirebase: jest.fn(() => Promise.resolve()),
  AppleUserCanceledError: class AppleUserCanceledError extends Error {
    constructor() {
      super('User canceled Apple sign-in');
      this.name = 'AppleUserCanceledError';
    }
  },
}));

jest.mock('../../monetization/paywallConfig', () => ({
  isPaywallEnabled: () => paywallGate.enabled,
  getPaywallDebugInfo: () => ({
    fromProcessEnv: undefined,
    fromExtraEnableSyncPaywall: undefined,
    isPaywallEnabled: paywallGate.enabled,
  }),
}));

jest.mock('../../monetization/subscriptionState', () => ({
  getCachedHasSyncEntitlement: jest.fn(() => false),
  getSyncEntitlementSourcesDebug: jest.fn(() => ({
    legacySubscribed: false,
    localTrialActive: false,
    revenueCatChinottoPro: false,
  })),
}));

jest.mock('../../monetization/syncPurchaseFlow', () => ({
  openSyncPurchaseFlow: jest.fn(() => Promise.resolve({ kind: 'purchased' as const, productIdentifier: 'test' })),
}));

jest.mock('../../src/services/purchases/offerings', () => ({
  loadCurrentChinottoOffering: jest.fn(() =>
    Promise.resolve({ ok: false, reason: 'no_current_offering' as const })
  ),
}));

jest.mock('../../src/services/purchases/revenueCatDebugLog', () => ({
  logRevenueCatSubscriptionsAndProducts: jest.fn(() => Promise.resolve()),
}));

import { enableAppleSyncWithFirebase } from '../../auth/enableAppleSync';
import { getCachedHasSyncEntitlement } from '../../monetization/subscriptionState';
import { openSyncPurchaseFlow } from '../../monetization/syncPurchaseFlow';
import { loadCurrentChinottoOffering } from '../../src/services/purchases/offerings';
import { mirrorChinottoSyncAccessToFirestore } from '../../sync/firestoreSyncAccessMirror';
import { processSyncQueue } from '../../sync/syncEngine';
import { flushSyncTombstoneOutbox } from '../../sync/tombstoneFlush';
import { CHINOTTO_DESKTOP_WEB_URL, EnableSyncModal } from '../EnableSyncModal';

const mockMirrorChinottoSyncAccess = jest.mocked(mirrorChinottoSyncAccessToFirestore);

/** Let paywall prefetch `useEffect` finish (avoids act() warnings on setState after `loadCurrentChinottoOffering`). */
async function flushPaywallPrefetch() {
  await act(async () => {
    await new Promise<void>((resolve) => setImmediate(resolve));
  });
}

describe('EnableSyncModal', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockClipboardSetString.mockClear();
    mockSignOut.mockClear();
    mockSignOut.mockImplementation(() => Promise.resolve());
    paywallGate.enabled = false;
    mockGetEntitlement.mockReturnValue(false);
    mockOpenSyncPurchaseFlow.mockClear();
    mockOpenSyncPurchaseFlow.mockResolvedValue({ kind: 'purchased', productIdentifier: 'test' });
    jest.mocked(enableAppleSyncWithFirebase).mockClear();
    jest.mocked(loadCurrentChinottoOffering).mockClear();
    jest.mocked(loadCurrentChinottoOffering).mockResolvedValue({
      ok: false,
      reason: 'no_current_offering',
    });
    jest.mocked(processSyncQueue).mockClear();
    jest.mocked(flushSyncTombstoneOutbox).mockClear();
    mockMirrorChinottoSyncAccess.mockClear();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  const baseProps = {
    fg: '#fff',
    fgDim: '#aaa',
    muted: '#888',
    bgElevated: '#111',
    border: '#333',
    subscriptionHydrated: true,
  } as const;

  it('mirrors inactive to Firestore then calls signOut and closes when Stop syncing is pressed while signed in', async () => {
    const onClose = jest.fn();

    const { getByLabelText } = render(
      <EnableSyncModal
        visible
        onClose={onClose}
        onEnabled={jest.fn()}
        authPhase="signed_in"
        {...baseProps}
      />
    );

    fireEvent.press(getByLabelText('Stop syncing on this device'));

    await waitFor(() => {
      expect(mockMirrorChinottoSyncAccess).toHaveBeenCalledWith({ forceInactive: true });
    });
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith({ mockAuth: true });
    });
    expect(mockMirrorChinottoSyncAccess.mock.invocationCallOrder[0]).toBeLessThan(
      mockSignOut.mock.invocationCallOrder[0]!
    );
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows post-sync desktop hint when devPostSyncPreviewNonce increments', () => {
    const { getByText, rerender } = render(
      <EnableSyncModal
        visible={false}
        onClose={jest.fn()}
        onEnabled={jest.fn()}
        authPhase="signed_out"
        {...baseProps}
      />
    );

    rerender(
      <EnableSyncModal
        visible
        onClose={jest.fn()}
        onEnabled={jest.fn()}
        authPhase="signed_out"
        devPostSyncPreviewNonce={1}
        {...baseProps}
      />
    );

    expect(getByText('Sync enabled')).toBeTruthy();
    expect(getByText('Continue on desktop.')).toBeTruthy();
  });

  it('shows sync health note when signed in and syncHealthNote is set', () => {
    const { getByText } = render(
      <EnableSyncModal
        visible
        onClose={jest.fn()}
        onEnabled={jest.fn()}
        authPhase="signed_in"
        syncHealthNote="Uploads are waiting—check your connection."
        {...baseProps}
      />
    );

    expect(getByText(/Uploads are waiting/)).toBeTruthy();
  });

  it('marketing preview shows post-paywall Apple step and does not run Apple when frozen', async () => {
    paywallGate.enabled = true;
    mockGetEntitlement.mockReturnValue(false);
    jest.mocked(enableAppleSyncWithFirebase).mockClear();

    const { getByText, queryByText } = render(
      <EnableSyncModal
        visible
        onClose={jest.fn()}
        onEnabled={jest.fn()}
        authPhase="signed_out"
        marketingPreviewAppleConnectStep
        marketingPreviewFreezeActions
        {...baseProps}
      />
    );

    await flushPaywallPrefetch();

    expect(getByText('Use Apple to connect your devices.')).toBeTruthy();
    expect(queryByText('Continue on another device')).toBeNull();
    expect(enableAppleSyncWithFirebase).not.toHaveBeenCalled();
  });

  it('drains sync queue and tombstone outbox after Apple sign-in succeeds, then shows desktop hint', async () => {
    const onEnabled = jest.fn();
    const onClose = jest.fn();

    const { getByLabelText, getByText, getByTestId } = render(
      <EnableSyncModal
        visible
        onClose={onClose}
        onEnabled={onEnabled}
        authPhase="signed_out"
        {...baseProps}
      />
    );

    fireEvent.press(getByLabelText('Continue with Apple'));

    await waitFor(() => {
      expect(enableAppleSyncWithFirebase).toHaveBeenCalled();
      expect(processSyncQueue).toHaveBeenCalled();
      expect(flushSyncTombstoneOutbox).toHaveBeenCalled();
      expect(onEnabled).toHaveBeenCalled();
    });

    expect(onClose).not.toHaveBeenCalled();
    expect(getByText('Sync enabled')).toBeTruthy();
    expect(getByText('Your thoughts will stay with you across devices.')).toBeTruthy();

    fireEvent.press(getByTestId('enable-sync-modal-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });

  it('copies desktop URL and shows Copied when Continue on desktop is pressed', async () => {
    const onEnabled = jest.fn();
    jest.useFakeTimers();
    try {
      const { getByLabelText, getByText, queryByText } = render(
        <EnableSyncModal
          visible
          onClose={jest.fn()}
          onEnabled={onEnabled}
          authPhase="signed_out"
          {...baseProps}
        />
      );

      fireEvent.press(getByLabelText('Continue with Apple'));

      await waitFor(() => {
        expect(onEnabled).toHaveBeenCalled();
      });

      fireEvent.press(getByLabelText('Continue on desktop, copies link to clipboard'));

      await waitFor(() => {
        expect(mockClipboardSetString).toHaveBeenCalledWith(CHINOTTO_DESKTOP_WEB_URL);
      });

      expect(getByText('Copied')).toBeTruthy();

      act(() => {
        jest.advanceTimersByTime(2100);
      });

      expect(queryByText('Copied')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('shows a short wait when paywall is on but subscription state is not hydrated yet', () => {
    paywallGate.enabled = true;

    const { getByText } = render(
      <EnableSyncModal
        visible
        onClose={jest.fn()}
        onEnabled={jest.fn()}
        authPhase="signed_out"
        {...baseProps}
        subscriptionHydrated={false}
      />
    );

    expect(getByText('One moment…')).toBeTruthy();
  });

  it('shows sync paywall when paywall is enabled and user has no entitlement', async () => {
    paywallGate.enabled = true;
    mockGetEntitlement.mockReturnValue(false);

    const { getByText, getByLabelText, queryByTestId } = render(
      <EnableSyncModal
        visible
        onClose={jest.fn()}
        onEnabled={jest.fn()}
        authPhase="signed_out"
        {...baseProps}
      />
    );

    await flushPaywallPrefetch();

    expect(queryByTestId('temp-rc-offerings-debug')).toBeNull();
    expect(getByText('Continue on another device')).toBeTruthy();
    expect(getByText('Local by default. Sync is optional.')).toBeTruthy();
    expect(getByLabelText('Enable sync with selected plan')).toBeTruthy();
    expect(getByLabelText('Not now')).toBeTruthy();
  });

  it('runs openSyncPurchaseFlow then reveals Apple when Continue is pressed on paywall', async () => {
    const onUnlocked = jest.fn();
    paywallGate.enabled = true;
    mockGetEntitlement.mockReturnValue(false);
    mockOpenSyncPurchaseFlow.mockImplementation(async () => {
      mockGetEntitlement.mockReturnValue(true);
      return { kind: 'purchased' as const, productIdentifier: 'chinotto.pro.yearly' };
    });

    const { getByLabelText, getByText } = render(
      <EnableSyncModal
        visible
        onClose={jest.fn()}
        onEnabled={jest.fn()}
        authPhase="signed_out"
        onSubscriptionUnlocked={onUnlocked}
        {...baseProps}
      />
    );

    await flushPaywallPrefetch();

    fireEvent.press(getByLabelText('Enable sync with selected plan'));

    await waitFor(() => {
      expect(mockOpenSyncPurchaseFlow).toHaveBeenCalledWith({ packageKind: 'yearly' });
      expect(onUnlocked).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(getByLabelText('Continue with Apple')).toBeTruthy();
    });

    fireEvent.press(getByLabelText('Continue with Apple'));

    await waitFor(() => {
      expect(enableAppleSyncWithFirebase).toHaveBeenCalled();
    });
  });

  it('shows RevenueCat setup hint when purchase returns success but sync entitlement stays false', async () => {
    paywallGate.enabled = true;
    mockGetEntitlement.mockReturnValue(false);
    mockOpenSyncPurchaseFlow.mockResolvedValue({
      kind: 'purchased_without_entitlement',
      productIdentifier: 'chinotto.pro.monthly',
    });

    const { getByLabelText, getByText } = render(
      <EnableSyncModal
        visible
        onClose={jest.fn()}
        onEnabled={jest.fn()}
        authPhase="signed_out"
        {...baseProps}
      />
    );

    await flushPaywallPrefetch();

    fireEvent.press(getByLabelText('Enable sync with selected plan'));

    await waitFor(() => {
      expect(getByText(/Sync access is not active yet/)).toBeTruthy();
      expect(getByText(/Chinotto Pro/)).toBeTruthy();
    });
  });

  it('passes selected plan kind to openSyncPurchaseFlow when Monthly is chosen', async () => {
    paywallGate.enabled = true;
    mockGetEntitlement.mockReturnValue(false);
    mockOpenSyncPurchaseFlow.mockResolvedValue({ kind: 'cancelled' });

    const { getByLabelText, getByText } = render(
      <EnableSyncModal
        visible
        onClose={jest.fn()}
        onEnabled={jest.fn()}
        authPhase="signed_out"
        {...baseProps}
      />
    );

    await flushPaywallPrefetch();

    fireEvent.press(getByText('Monthly'));
    fireEvent.press(getByLabelText('Enable sync with selected plan'));

    await waitFor(() => {
      expect(mockOpenSyncPurchaseFlow).toHaveBeenCalledWith({ packageKind: 'monthly' });
    });
  });

  it('shows trial-aware monthly copy when intro offer metadata is available', async () => {
    paywallGate.enabled = true;
    mockGetEntitlement.mockReturnValue(false);
    jest.mocked(loadCurrentChinottoOffering).mockResolvedValue({
      ok: true,
      offering: {} as never,
      packages: [
        {
          kind: 'monthly',
          rcPackage: {} as never,
          storeProductId: 'monthly',
          priceString: '$4.99',
          introPriceString: '$0.00',
          introCycles: 1,
          introPeriodUnit: 'WEEK',
          introIsFreeTrial: true,
        },
      ],
    });

    const { getByText } = render(
      <EnableSyncModal
        visible
        onClose={jest.fn()}
        onEnabled={jest.fn()}
        authPhase="signed_out"
        {...baseProps}
      />
    );

    await flushPaywallPrefetch();

    fireEvent.press(getByText('Monthly'));
    expect(getByText('1-week free trial')).toBeTruthy();
  });

  it('does not show trial copy when selected package has no intro offer', async () => {
    paywallGate.enabled = true;
    mockGetEntitlement.mockReturnValue(false);
    jest.mocked(loadCurrentChinottoOffering).mockResolvedValue({
      ok: true,
      offering: {} as never,
      packages: [
        {
          kind: 'yearly',
          rcPackage: {} as never,
          storeProductId: 'yearly',
          priceString: '$29.99',
        },
      ],
    });

    const { queryByText } = render(
      <EnableSyncModal
        visible
        onClose={jest.fn()}
        onEnabled={jest.fn()}
        authPhase="signed_out"
        {...baseProps}
      />
    );

    await flushPaywallPrefetch();

    expect(queryByText('1-week free trial')).toBeNull();
    expect(queryByText('Then $4.99/month.')).toBeNull();
  });
});
