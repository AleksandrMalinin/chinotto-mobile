import { fireEvent, render } from '@testing-library/react-native';

import { VoiceMicButton } from '../VoiceCaptureControl';
import { getTheme } from '../../theme';

describe('VoiceMicButton', () => {
  const theme = getTheme();

  it('invokes onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<VoiceMicButton phase="idle" onPress={onPress} theme={theme} />);
    fireEvent.press(getByRole('button', { name: 'Speak thought' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('exposes stop listening while active', () => {
    const { getByRole } = render(<VoiceMicButton phase="listening" onPress={jest.fn()} theme={theme} />);
    expect(getByRole('button', { name: 'Stop listening' })).toBeTruthy();
  });

  it('marks control as busy while listening', () => {
    const { getByRole } = render(<VoiceMicButton phase="listening" onPress={jest.fn()} theme={theme} />);
    expect(getByRole('button', { name: 'Stop listening' }).props.accessibilityState?.busy).toBe(true);
  });
});
