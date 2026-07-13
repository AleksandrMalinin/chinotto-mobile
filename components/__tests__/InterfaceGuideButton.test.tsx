import { fireEvent, render } from '@testing-library/react-native';

import { InterfaceGuideButton } from '../InterfaceGuideButton';

describe('InterfaceGuideButton', () => {
  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<InterfaceGuideButton onPress={onPress} />);

    fireEvent.press(getByTestId('interface-guide-button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
