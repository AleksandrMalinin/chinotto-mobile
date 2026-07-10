import { render } from '@testing-library/react-native';

import { SheetEditVoiceDock } from '../SheetEditVoiceDock';
import { getTheme } from '../../theme';

describe('SheetEditVoiceDock', () => {
  it('shows listening status beside the mic', () => {
    const { getByTestId, getByText } = render(
      <SheetEditVoiceDock phase="listening" onPress={jest.fn()} theme={getTheme()} />,
    );
    expect(getByTestId('voice-listening-bar')).toBeTruthy();
    expect(getByText('Listening')).toBeTruthy();
    expect(getByText('Tap mic when done')).toBeTruthy();
  });

  it('shows only the mic when idle', () => {
    const { getByTestId, queryByText } = render(
      <SheetEditVoiceDock phase="idle" onPress={jest.fn()} theme={getTheme()} />,
    );
    expect(getByTestId('sheet-voice-dock')).toBeTruthy();
    expect(queryByText('Listening')).toBeNull();
  });
});
