import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { AdaptiveChromeContextValue } from '../../theme';
import { AdaptiveChromeContext } from '../../theme';
import { SettingsScreen } from '../SettingsScreen';

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
    ChinottoLogo: () => React.createElement(RN.Text, { testID: 'settings-logo-mock' }, 'logo'),
    chinottoLogoLeadingOutset: () => 0,
  };
});

jest.mock('../../storage/themeRepository', () => ({
  listUserThemes: jest.fn(() => Promise.resolve([])),
  createUserTheme: jest.fn(),
  updateUserTheme: jest.fn(),
  deleteUserTheme: jest.fn(),
}));

function renderSettings(
  props?: Partial<ComponentProps<typeof SettingsScreen>>,
  chrome: Partial<AdaptiveChromeContextValue> = {},
) {
  const setDisplayChrome = jest.fn();
  const value: AdaptiveChromeContextValue = {
    blendProgress: 0,
    displayChrome: 'auto',
    setDisplayChrome,
    ...chrome,
  };
  const view = render(
    <AdaptiveChromeContext.Provider value={value}>
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, left: 0, right: 0, bottom: 34 },
        }}
      >
        <SettingsScreen
          onClose={jest.fn()}
          onOpenSync={jest.fn()}
          onOpenManifesto={jest.fn()}
          syncStatusLabel="Off"
          {...props}
        />
      </SafeAreaProvider>
    </AdaptiveChromeContext.Provider>
  );
  return { ...view, setDisplayChrome };
}

describe('SettingsScreen', () => {
  it('shows app version without a beta badge', async () => {
    renderSettings();
    expect(await screen.findByText('1.0.test')).toBeTruthy();
    expect(screen.queryByText('β')).toBeNull();
  });

  it('lists Appearance with contrast options', async () => {
    renderSettings();

    expect(await screen.findByText('Appearance')).toBeTruthy();
    expect(screen.getByTestId('settings-chrome-auto')).toBeTruthy();
    expect(screen.getByTestId('settings-chrome-normal')).toBeTruthy();
    expect(screen.getByTestId('settings-chrome-sunlight')).toBeTruthy();
    expect(screen.queryByText('Experience')).toBeNull();
    expect(screen.queryByText('Haptic feedback')).toBeNull();
  });

  it('calls setDisplayChrome when choosing a contrast mode', async () => {
    const { setDisplayChrome } = renderSettings();

    fireEvent.press(await screen.findByTestId('settings-chrome-sunlight'));
    expect(setDisplayChrome).toHaveBeenCalledWith('sunlight');

    fireEvent.press(screen.getByTestId('settings-chrome-normal'));
    expect(setDisplayChrome).toHaveBeenCalledWith('normal');

    fireEvent.press(screen.getByTestId('settings-chrome-auto'));
    expect(setDisplayChrome).toHaveBeenCalledWith('auto');
  });

  it('shows App icon row under Appearance when enabled', async () => {
    renderSettings({
      canOpenAppIcon: true,
      onOpenAppIcon: jest.fn(),
      appIconLabel: 'Chinotto',
    });

    expect(await screen.findByText('Appearance')).toBeTruthy();
    expect(screen.getByTestId('settings-open-app-icon')).toBeTruthy();
  });

  it('shows Enable sync when cloud sync is off', async () => {
    renderSettings({ syncStatusLabel: 'Off' });
    expect(await screen.findByText('Enable sync')).toBeTruthy();
  });

  it('shows Manage when sync is on so the row label does not repeat the Sync section title', async () => {
    renderSettings({ syncStatusLabel: 'Sync on' });
    expect(await screen.findByText('Manage')).toBeTruthy();
  });

  it('shows Account section when signed in to sync', async () => {
    const onOpenDeleteAccount = jest.fn();
    renderSettings({
      syncStatusLabel: 'Sync on',
      accountSectionVisible: true,
      accountIdentityLabel: 'user@privaterelay.appleid.com',
      onOpenDeleteAccount,
    });

    expect(await screen.findByText('Account')).toBeTruthy();
    expect(screen.getByText('user@privaterelay.appleid.com')).toBeTruthy();
    expect(screen.getByTestId('settings-delete-account')).toBeTruthy();

    fireEvent.press(screen.getByTestId('settings-delete-account'));
    expect(onOpenDeleteAccount).toHaveBeenCalled();
  });
});
