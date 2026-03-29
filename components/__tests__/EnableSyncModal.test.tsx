import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockSignOut = jest.fn((_auth?: unknown) => Promise.resolve());

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

import { enableAppleSyncWithFirebase } from '../../auth/enableAppleSync';
import { processSyncQueue } from '../../sync/syncEngine';
import { flushSyncTombstoneOutbox } from '../../sync/tombstoneFlush';
import { EnableSyncModal } from '../EnableSyncModal';

describe('EnableSyncModal', () => {
  beforeEach(() => {
    mockSignOut.mockClear();
    mockSignOut.mockImplementation(() => Promise.resolve());
    jest.mocked(enableAppleSyncWithFirebase).mockClear();
    jest.mocked(processSyncQueue).mockClear();
    jest.mocked(flushSyncTombstoneOutbox).mockClear();
  });

  it('calls signOut and closes when Stop syncing is pressed while signed in', async () => {
    const onClose = jest.fn();

    const { getByLabelText } = render(
      <EnableSyncModal
        visible
        onClose={onClose}
        onEnabled={jest.fn()}
        authPhase="signed_in"
        fg="#fff"
        fgDim="#aaa"
        muted="#888"
        bgElevated="#111"
        border="#333"
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

  it('drains sync queue and tombstone outbox after Apple sign-in succeeds', async () => {
    const onEnabled = jest.fn();
    const onClose = jest.fn();

    const { getByLabelText } = render(
      <EnableSyncModal
        visible
        onClose={onClose}
        onEnabled={onEnabled}
        authPhase="signed_out"
        fg="#fff"
        fgDim="#aaa"
        muted="#888"
        bgElevated="#111"
        border="#333"
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
});
