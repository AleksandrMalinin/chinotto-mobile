import { fireEvent, render } from '@testing-library/react-native';

import { TemporalMonthScrubber } from '../TemporalMonthScrubber';

describe('TemporalMonthScrubber', () => {
  it('renders label and handles press', () => {
    const onPress = jest.fn();
    const { getByTestId, getByLabelText } = render(
      <TemporalMonthScrubber
        label="May"
        visible
        onPress={onPress}
        rightInset={16}
        bottomInset={80}
      />,
    );

    expect(getByLabelText('May')).toBeTruthy();
    fireEvent.press(getByTestId('temporal-month-scrubber'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
