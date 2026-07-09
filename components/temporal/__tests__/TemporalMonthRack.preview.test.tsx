import { render } from '@testing-library/react-native';

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
  {
    monthKey: '2026-03',
    count: 1,
    newestCreatedAt: '2026-03-10T00:00:00.000Z',
    newestEntryId: 'c',
  },
];

describe('TemporalMonthRack preview', () => {
  it('renders scrub scroll when onMonthPreview is wired', () => {
    const { getByTestId } = render(
      <TemporalMonthRack
        months={months}
        streamMonthKey="2026-05"
        visible
        rightInset={0}
        onMonthPreview={jest.fn()}
        onMonthCommitted={jest.fn()}
        onActiveMonthPress={jest.fn()}
      />,
    );
    expect(getByTestId('temporal-month-rack-scroll')).toBeTruthy();
  });
});
