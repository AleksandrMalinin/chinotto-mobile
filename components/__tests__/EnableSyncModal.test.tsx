import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockSignOut = jest.fn((_auth?: unknown) => Promise.resolve());
const mockPaywallEnabled = jest.mocked(isPaywallEnabled);
const mockGetSubscribed = jest.mocked(getCachedIsSubscribed);
const mockStubPurchase = jest.mocked(stubCompleteChinottoPlusPurchase);

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
  isPaywallEnabled: jest.fn(() => false),
}));

jest.mock('../../monetization/subscriptionState', () => ({
  getCachedIsSubscribed: jest.fn(() => false),
  stubCompleteChinottoPlusPurchase: jest.fn(() => Promise.resolve()),
}));

import { enableAppleSyncWithFirebase } from '../../auth/enableAppleSync';
import { isPaywallEnabled } from '../../monetization/paywallConfig';
import {
  getCachedIsSubscribed,
  stubCompleteChinottoPlusPurchase,
} from '../../monetization/subscriptionState';
import { processSyncQueue } from '../../sync/syncEngine';
import { flushSyncTombstoneOutbox } from '../../sync/tombstoneFlush';
import { EnableSyncModal } from '../EnableSyncModal';

describe('EnableSyncModal', () => {
  beforeEach(() => {
    mockSignOut.mockClear();
    mockSignOut.mockImplementation(() => Promise.resolve());
    mockPaywallEnabled.mockReturnValue(false);
    mockGetSubscribed.mockReturnValue(false);
    mockStubPurchase.mockClear();
    mockStubPurchase.mockImplementation(() => Promise.resolve());
    jest.mocked(enableAppleSyncWithFirebase).mockClear();
    jest.mocked(processSyncQueue).mockClear();
    jest.mocked(flushSyncTombstoneOutbox).mockClear();
  });

  const baseProps = {
    fg: '#fff',
    fgDim: '#aaa',
    muted: '#888',
    bgElevated: '#111',
    border: '#333',
    subscriptionHydrated: true,
  } as const;

  it('calls signOut and closes when Stop syncing is pressed while signed in', async () => {
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
      expect(mockSignOut).toHaveBeenCalledWith({ mockAuth: true });
    });
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
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

  it('drains sync queue and tombstone outbox after Apple sign-in succeeds', async () => {
    const onEnabled = jest.fn();
    const onClose = jest.fn();

    const { getByLabelText } = render(
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
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows a short wait when paywall is on but subscription state is not hydrated yet', () => {
    mockPaywallEnabled.mockReturnValue(true);

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

  it('shows Chinotto Plus copy when paywall is enabled and user is not subscribed', () => {
    mockPaywallEnabled.mockReturnValue(true);
    mockGetSubscribed.mockReturnValue(false);

    const { getByText, getByLabelText } = render(
      <EnableSyncModal
        visible
        onClose={jest.fn()}
        onEnabled={jest.fn()}
        authPhase="signed_out"
        {...baseProps}
      />
    );

    expect(getByText('Sync your thoughts across devices')).toBeTruthy();
    expect(getByText('Everything stays local by default.')).toBeTruthy();
    expect(getByText('Sync is optional.')).toBeTruthy();
    expect(getByText('Enable it with Chinotto Plus')).toBeTruthy();
    expect(getByLabelText('Continue')).toBeTruthy();
  });

  it('runs stub purchase then reveals Apple when Continue is pressed on paywall', async () => {
    const onUnlocked = jest.fn();
    mockPaywallEnabled.mockReturnValue(true);
    mockGetSubscribed.mockReturnValue(false);
    mockStubPurchase.mockImplementation(async () => {
      mockGetSubscribed.mockReturnValue(true);
    });

    const { getByLabelText } = render(
      <EnableSyncModal
        visible
        onClose={jest.fn()}
        onEnabled={jest.fn()}
        authPhase="signed_out"
        onSubscriptionUnlocked={onUnlocked}
        {...baseProps}
      />
    );

    fireEvent.press(getByLabelText('Continue'));

    await waitFor(() => {
      expect(mockStubPurchase).toHaveBeenCalled();
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
});
