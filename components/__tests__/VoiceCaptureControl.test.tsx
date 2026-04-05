import { fireEvent, render } from '@testing-library/react-native';

import { VoiceCaptureControl } from '../VoiceCaptureControl';
import { getTheme } from '../../theme';

describe('VoiceCaptureControl', () => {
  const theme = getTheme('dark');

  it('invokes onPress when the mic control is pressed', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <VoiceCaptureControl phase="idle" onPress={onPress} theme={theme} />,
    );
    fireEvent.press(getByRole('button', { name: 'Speak thought' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows stop label while listening', () => {
    const { getByRole } = render(
      <VoiceCaptureControl phase="listening" onPress={jest.fn()} theme={theme} />,
    );
    expect(getByRole('button', { name: 'Stop listening' })).toBeTruthy();
  });
});
