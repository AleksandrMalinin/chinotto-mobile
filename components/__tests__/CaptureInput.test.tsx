import { fireEvent, render } from '@testing-library/react-native';

import { CaptureInput } from '../CaptureInput';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }),
}));

describe('CaptureInput', () => {
  it('forwards value changes to onChangeText', () => {
    const onChangeText = jest.fn();
    const { getByTestId } = render(
      <CaptureInput
        value=""
        onChangeText={onChangeText}
        onSubmit={jest.fn()}
        minHeight={120}
      />
    );

    fireEvent.changeText(getByTestId('capture-input'), 'note');

    expect(onChangeText).toHaveBeenCalledWith('note');
  });

  it('invokes onSubmit when submit editing fires', () => {
    const onSubmit = jest.fn();
    const { getByTestId } = render(
      <CaptureInput
        value="hello"
        onChangeText={jest.fn()}
        onSubmit={onSubmit}
        minHeight={120}
      />
    );

    fireEvent(getByTestId('capture-input'), 'submitEditing');

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
