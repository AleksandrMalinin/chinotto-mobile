import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

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

  it('uses hero typography and invitation color when empty', () => {
    const { getByTestId } = render(
      <CaptureInput
        value=""
        onChangeText={jest.fn()}
        onSubmit={jest.fn()}
        minHeight={120}
        placeholder="Jot a thought…"
      />,
    );

    const input = getByTestId('capture-input');
    const flat = StyleSheet.flatten(input.props.style);
    expect(flat.fontSize).toBe(22);
    expect(input.props.placeholderTextColor).toBe('rgba(255,255,255,0.72)');
  });

  it('settles to capture typography once text is present', () => {
    const { getByTestId } = render(
      <CaptureInput
        value="hello"
        onChangeText={jest.fn()}
        onSubmit={jest.fn()}
        minHeight={120}
      />,
    );

    const flat = StyleSheet.flatten(getByTestId('capture-input').props.style);
    expect(flat.fontSize).toBe(18);
    expect(flat.lineHeight).toBe(30);
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
