import { fireEvent, render } from '@testing-library/react-native';

import { TemporalMonthRack } from '../TemporalMonthRack';

const months = [
  {
    monthKey: '2026-05',
    count: 3,
    newestCreatedAt: '2026-05-10T00:00:00.000Z',
    newestEntryId: 'a',
  },
  {
    monthKey: '2026-04',
    count: 2,
    newestCreatedAt: '2026-04-10T00:00:00.000Z',
    newestEntryId: 'b',
  },
];

describe('TemporalMonthRack', () => {
  it('renders month rows and active month press', () => {
    const onActiveMonthPress = jest.fn();
    const { getByTestId } = render(
      <TemporalMonthRack
        months={months}
        streamMonthKey="2026-05"
        visible
        referenceMonthKey="2026-05"
        rightInset={6}
        topInset={80}
        bottomInset={40}
        onMonthCommitted={jest.fn()}
        onActiveMonthPress={onActiveMonthPress}
      />,
    );

    fireEvent.press(getByTestId('temporal-month-rack-active'));
    expect(onActiveMonthPress).toHaveBeenCalledTimes(1);
  });
});
