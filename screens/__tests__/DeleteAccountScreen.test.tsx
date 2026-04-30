jest.mock('../../auth/appleSignInCredential', () => ({
  AppleUserCanceledError: class AppleUserCanceledError extends Error {
    constructor() {
      super('User canceled Apple sign-in');
      this.name = 'AppleUserCanceledError';
    }
  },
}));

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { AdaptiveChromeContextValue } from '../../theme';
import { AdaptiveChromeContext } from '../../theme';
import * as DeleteFlow from '../../sync/deleteChinottoAccount';
import { DeleteAccountScreen } from '../DeleteAccountScreen';

jest.mock('expo-constants', () => {
  const actual = jest.requireActual<typeof import('expo-constants')>('expo-constants');
  return {
    ...actual,
    expoConfig: { version: '1.0.test' },
    statusBarHeight: 47,
  };
});

jest.mock('../../components/ChinottoLogo', () => {
  const React = require('react');
  const RN = require('react-native');
  return {
    ChinottoLogo: () => React.createElement(RN.Text, { testID: 'delete-account-logo-mock' }, 'logo'),
    chinottoLogoLeadingOutset: () => 0,
  };
});

jest.mock('../../analytics/analytics', () => ({
  track: jest.fn(),
}));

jest.mock('../../sync/deleteChinottoAccount', () => ({
  AccountDeletionNeedsRecentLogin: class AccountDeletionNeedsRecentLogin extends Error {
    constructor() {
      super('needs-login');
      this.name = 'AccountDeletionNeedsRecentLogin';
    }
  },
  DeleteChinottoAccountError: class DeleteChinottoAccountError extends Error {
    failure = 'network';
    constructor() {
      super('fail');
      this.name = 'DeleteChinottoAccountError';
    }
  },
  deleteChinottoAccountForCurrentUser: jest.fn(() => Promise.resolve()),
  resumeChinottoAccountDeletionAfterReauth: jest.fn(() => Promise.resolve()),
}));

function renderDeleteScreen(props?: { onClose?: () => void; onAccountDeleted?: () => void }) {
  const value: AdaptiveChromeContextValue = {
    blendProgress: 0,
    displayChrome: 'auto',
    setDisplayChrome: jest.fn(),
  };
  return render(
    <AdaptiveChromeContext.Provider value={value}>
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, left: 0, right: 0, bottom: 34 },
        }}
      >
        <DeleteAccountScreen
          visible
          onClose={props?.onClose ?? jest.fn()}
          onAccountDeleted={props?.onAccountDeleted ?? jest.fn()}
        />
      </SafeAreaProvider>
    </AdaptiveChromeContext.Provider>
  );
}

describe('DeleteAccountScreen', () => {
  beforeEach(() => {
    jest.mocked(DeleteFlow.deleteChinottoAccountForCurrentUser).mockResolvedValue(undefined);
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows Apple-required copy verbatim', async () => {
    renderDeleteScreen();

    expect(await screen.findByText('Delete account?')).toBeTruthy();
    expect(
      screen.getByText(
        'Deleting your Chinotto account will permanently remove your synced data from the cloud.'
      )
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Your App Store subscription is managed by Apple and will not be canceled automatically. To stop future billing, cancel your subscription in App Store settings before deleting your account.'
      )
    ).toBeTruthy();
    expect(screen.getByText('This action cannot be undone.')).toBeTruthy();
  });

  it('opens confirmation modal with exact final copy before deletion', async () => {
    renderDeleteScreen();

    fireEvent.press(await screen.findByLabelText('Delete account'));

    expect(screen.getByText('Are you sure?')).toBeTruthy();
    expect(
      screen.getByText('This will permanently delete your Chinotto account and all synced data.')
    ).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Delete permanently'));

    await waitFor(() => {
      expect(DeleteFlow.deleteChinottoAccountForCurrentUser).toHaveBeenCalled();
    });
  });

  it('invokes onAccountDeleted after successful deletion', async () => {
    const onAccountDeleted = jest.fn();
    renderDeleteScreen({ onAccountDeleted });

    fireEvent.press(await screen.findByLabelText('Delete account'));
    fireEvent.press(screen.getByLabelText('Delete permanently'));

    await waitFor(() => {
      expect(onAccountDeleted).toHaveBeenCalled();
    });
  });

  it('shows recent-login alert when deletion requests reauthentication', async () => {
    jest
      .mocked(DeleteFlow.deleteChinottoAccountForCurrentUser)
      .mockRejectedValueOnce(new DeleteFlow.AccountDeletionNeedsRecentLogin());

    renderDeleteScreen();

    fireEvent.press(await screen.findByLabelText('Delete account'));
    fireEvent.press(screen.getByLabelText('Delete permanently'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        '',
        'Please sign in again to confirm account deletion.',
        expect.any(Array)
      );
    });
  });

  it('calls resumeChinottoAccountDeletionAfterReauth when user continues from recent-login alert', async () => {
    jest
      .mocked(DeleteFlow.deleteChinottoAccountForCurrentUser)
      .mockRejectedValueOnce(new DeleteFlow.AccountDeletionNeedsRecentLogin());

    let alertButtons: { text: string; onPress?: () => void }[] = [];
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      alertButtons = buttons as { text: string; onPress?: () => void }[];
    });

    renderDeleteScreen();

    fireEvent.press(await screen.findByLabelText('Delete account'));
    fireEvent.press(screen.getByLabelText('Delete permanently'));

    await waitFor(() => expect(alertButtons.length).toBeGreaterThan(0));

    const continueBtn = alertButtons.find((b) => b.text === 'Continue');
    expect(continueBtn?.onPress).toBeDefined();

    await act(async () => {
      continueBtn!.onPress!();
    });

    await waitFor(() => {
      expect(DeleteFlow.resumeChinottoAccountDeletionAfterReauth).toHaveBeenCalled();
    });
  });
});
