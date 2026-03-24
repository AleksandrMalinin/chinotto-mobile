import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockSignOut = jest.fn((_auth?: unknown) => Promise.resolve());

jest.mock('firebase/auth', () => ({
  signOut: (auth: unknown) => mockSignOut(auth),
}));

jest.mock('../../sync/firebaseAuth', () => ({
  getOrInitAuth: jest.fn(() => ({ mockAuth: true })),
}));

import { EnableSyncModal } from '../EnableSyncModal';

describe('EnableSyncModal', () => {
  beforeEach(() => {
    mockSignOut.mockClear();
    mockSignOut.mockImplementation(() => Promise.resolve());
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
});
