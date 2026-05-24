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
  it('anchors the rack to the bottom trailing corner', () => {
    const { getByTestId } = render(
      <TemporalMonthRack
        months={months}
        streamMonthKey="2026-05"
        visible
        rightInset={6}
        bottomInset={40}
        onMonthCommitted={jest.fn()}
        onActiveMonthPress={jest.fn()}
      />,
    );

    const host = getByTestId('temporal-month-rack-host');
    expect(host.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ right: 6, bottom: 40 }),
      ]),
    );
    const flatStyle = Array.isArray(host.props.style)
      ? Object.assign({}, ...host.props.style.filter(Boolean))
      : host.props.style;
    expect(flatStyle.top).toBeUndefined();
  });

  it('renders month rows and active month press', () => {
    const onActiveMonthPress = jest.fn();
    const { getByTestId, getByText } = render(
      <TemporalMonthRack
        months={months}
        streamMonthKey="2026-05"
        visible
        rightInset={6}
        bottomInset={40}
        onMonthCommitted={jest.fn()}
        onActiveMonthPress={onActiveMonthPress}
      />,
    );

    expect(getByTestId('temporal-month-rack-year')).toBeTruthy();
    expect(getByText('2026')).toBeTruthy();
    expect(getByTestId('temporal-month-rack-year').props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ textAlign: 'center', width: '100%' }),
      ]),
    );
    fireEvent.press(getByTestId('temporal-month-rack-active'));
    expect(onActiveMonthPress).toHaveBeenCalledTimes(1);
  });
});
