import { fireEvent, render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Animated } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TemporalMapSheet } from '../TemporalMapSheet';

function renderMap(ui: ReactElement) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      {ui}
    </SafeAreaProvider>,
  );
}

const months = [
  {
    monthKey: '2026-05',
    count: 3,
    newestCreatedAt: '2026-05-10T00:00:00.000Z',
    newestEntryId: 'a',
  },
  {
    monthKey: '2026-03',
    count: 1,
    newestCreatedAt: '2026-03-01T00:00:00.000Z',
    newestEntryId: 'b',
  },
];

describe('TemporalMapSheet', () => {
  beforeEach(() => {
    jest.spyOn(Animated, 'spring').mockImplementation(() => ({ start: jest.fn() }) as never);
    jest.spyOn(Animated, 'timing').mockImplementation(
      () =>
        ({
          start: (callback?: (result: { finished: boolean }) => void) => {
            callback?.({ finished: true });
          },
        }) as never,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('selects a month and closes', () => {
    const onSelectMonth = jest.fn();
    const onClose = jest.fn();
    const { getByTestId } = renderMap(
      <TemporalMapSheet
        visible
        months={months}
        highlightedMonthKey="2026-05"
        onClose={onClose}
        onSelectMonth={onSelectMonth}
        hapticsEnabled={false}
      />,
    );

    fireEvent.press(getByTestId('temporal-map-month-2026-03'));
    expect(onSelectMonth).toHaveBeenCalledWith('2026-03');
    expect(onClose).toHaveBeenCalled();
  });
});
