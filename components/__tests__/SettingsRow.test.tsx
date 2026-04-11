import type { ReactElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { AdaptiveChromeContext } from '../../theme';
import { SettingsRow } from '../settings/SettingsRow';

function renderWithChrome(ui: ReactElement) {
  return render(
    <AdaptiveChromeContext.Provider
      value={{ blendProgress: 0, displayChrome: 'auto', setDisplayChrome: jest.fn() }}
    >
      {ui}
    </AdaptiveChromeContext.Provider>
  );
}

describe('SettingsRow choice', () => {
  it('shows a filled dot when selected', () => {
    const onPress = jest.fn();
    renderWithChrome(
      <SettingsRow variant="choice" label="Option" selected onPress={onPress} />
    );

    expect(screen.getByLabelText('Selected')).toBeTruthy();
    expect(screen.queryByLabelText('Not selected')).toBeNull();
  });

  it('shows no dot when not selected', () => {
    const onPress = jest.fn();
    renderWithChrome(
      <SettingsRow variant="choice" label="Option" selected={false} onPress={onPress} />
    );

    expect(screen.getByLabelText('Not selected')).toBeTruthy();
    expect(screen.queryByLabelText('Selected')).toBeNull();
  });

  it('invokes onPress', () => {
    const onPress = jest.fn();
    renderWithChrome(
      <SettingsRow variant="choice" label="Option" selected={false} onPress={onPress} />
    );

    fireEvent.press(screen.getByText('Option'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
