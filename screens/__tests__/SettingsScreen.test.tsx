import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppearanceModeContext } from '../../theme';
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
  appearanceMode: 'default' | 'sunlight',
  setMode: jest.Mock,
  props?: Partial<ComponentProps<typeof SettingsScreen>>,
) {
  return render(
    <AppearanceModeContext.Provider value={{ mode: appearanceMode, setMode }}>
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
    </AppearanceModeContext.Provider>
  );
}

describe('SettingsScreen', () => {
  it('lists Default and Sunlight mode under Appearance', async () => {
    const setMode = jest.fn();
    renderSettings('default', setMode);

    expect(await screen.findByText('Appearance')).toBeTruthy();
    expect(screen.getByText('Default')).toBeTruthy();
    expect(screen.getByText('Sunlight mode')).toBeTruthy();
    expect(screen.getByText('Better visibility in bright light')).toBeTruthy();
  });

  it('invokes setMode when choosing an appearance option', async () => {
    const setMode = jest.fn();
    renderSettings('default', setMode);

    fireEvent.press(await screen.findByTestId('settings-appearance-sunlight'));
    expect(setMode).toHaveBeenCalledWith('sunlight');

    fireEvent.press(screen.getByTestId('settings-appearance-default'));
    expect(setMode).toHaveBeenCalledWith('default');
  });
});
