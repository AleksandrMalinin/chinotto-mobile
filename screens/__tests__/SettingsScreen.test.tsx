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
          hapticsEnabled
          onHapticsEnabledChange={jest.fn()}
          {...props}
        />
      </SafeAreaProvider>
    </AdaptiveChromeContext.Provider>
  );
  return { ...view, setDisplayChrome };
}

describe('SettingsScreen', () => {
  it('lists Appearance with contrast options', async () => {
    renderSettings();

    expect(await screen.findByText('Appearance')).toBeTruthy();
    expect(screen.getByTestId('settings-chrome-auto')).toBeTruthy();
    expect(screen.getByTestId('settings-chrome-normal')).toBeTruthy();
    expect(screen.getByTestId('settings-chrome-sunlight')).toBeTruthy();
    expect(screen.getByText('Experience')).toBeTruthy();
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
});
