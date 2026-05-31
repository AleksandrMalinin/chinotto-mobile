import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { TemporalMonthRack, type TemporalMonthRackProps } from '../TemporalMonthRack';
import {
  TEMPORAL_MONTH_RACK_MAX_VISIBLE_ROWS,
  TEMPORAL_MONTH_RACK_ROW_HEIGHT,
} from '../../../constants/temporalNavigation';
import {
  getTemporalRackCompact,
  setTemporalRackCompact,
} from '../../../storage/temporalRackPrefs';

jest.mock('../../../storage/temporalRackPrefs', () => ({
  getTemporalRackCompact: jest.fn(() => Promise.resolve(false)),
  setTemporalRackCompact: jest.fn(() => Promise.resolve()),
  clearTemporalRackCompact: jest.fn(() => Promise.resolve()),
}));

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

function renderRack(overrides: Partial<TemporalMonthRackProps> = {}) {
  return render(
    <TemporalMonthRack
      months={months}
      streamMonthKey="2026-05"
      visible
      rightInset={0}
      onMonthCommitted={jest.fn()}
      onActiveMonthPress={jest.fn()}
      {...overrides}
    />,
  );
}

describe('TemporalMonthRack', () => {
  beforeEach(() => {
    jest.mocked(getTemporalRackCompact).mockResolvedValue(false);
    jest.mocked(setTemporalRackCompact).mockClear();
  });

  it('renders nothing when only a single month is available', () => {
    const { queryByTestId } = renderRack({ months: [months[0]] });
    expect(queryByTestId('temporal-month-rack-host')).toBeNull();
  });

  it('docks expanded rack on the trailing edge, vertically centered', () => {
    const { getByTestId } = renderRack();

    const host = getByTestId('temporal-month-rack-host');
    const flatStyle = Array.isArray(host.props.style)
      ? Object.assign({}, ...host.props.style.filter(Boolean))
      : host.props.style;
    expect(flatStyle).toEqual(
      expect.objectContaining({ right: 0, top: 0, bottom: 0, justifyContent: 'center' }),
    );
  });

  it('anchors minimized rack to the bottom trailing corner with year and month', async () => {
    jest.mocked(getTemporalRackCompact).mockResolvedValue(true);
    const { getByTestId, getByText } = renderRack({ bottomInset: 24 });

    await waitFor(() => {
      expect(getByTestId('temporal-month-rack-compact')).toBeTruthy();
    });
    const host = getByTestId('temporal-month-rack-host');
    const flatStyle = Array.isArray(host.props.style)
      ? Object.assign({}, ...host.props.style.filter(Boolean))
      : host.props.style;
    expect(flatStyle).toEqual(
      expect.objectContaining({ justifyContent: 'flex-end', paddingBottom: 24 }),
    );
    expect(getByText('2026')).toBeTruthy();
    expect(getByText('May')).toBeTruthy();
  });

  it('renders scroll rack with active month press', async () => {
    const onActiveMonthPress = jest.fn();
    const { getByTestId, getByText } = renderRack({ onActiveMonthPress });

    await waitFor(() => {
      expect(getByTestId('temporal-month-rack-expanded')).toBeTruthy();
    });
    const scrollArea = getByTestId('temporal-month-rack-scroll-area');
    expect(scrollArea.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          height: TEMPORAL_MONTH_RACK_MAX_VISIBLE_ROWS * TEMPORAL_MONTH_RACK_ROW_HEIGHT,
        }),
      ]),
    );
    expect(getByTestId('temporal-month-rack-year')).toBeTruthy();
    expect(getByText('2026')).toBeTruthy();
    fireEvent.press(getByTestId('temporal-month-rack-active'));
    expect(onActiveMonthPress).toHaveBeenCalledTimes(1);
  });

  it('restores compact mode from prefs', async () => {
    jest.mocked(getTemporalRackCompact).mockResolvedValue(true);
    const { getByTestId } = renderRack();

    await waitFor(() => {
      expect(getByTestId('temporal-month-rack-compact')).toBeTruthy();
    });
  });

  it('long press on year header collapses and persists compact mode', async () => {
    const { getByTestId, queryByTestId } = renderRack();

    await waitFor(() => {
      expect(getByTestId('temporal-month-rack-expanded')).toBeTruthy();
    });
    fireEvent(getByTestId('temporal-month-rack-year-header'), 'longPress');
    await waitFor(() => {
      expect(getByTestId('temporal-month-rack-compact')).toBeTruthy();
    });
    expect(queryByTestId('temporal-month-rack-expanded')).toBeNull();
    expect(setTemporalRackCompact).toHaveBeenCalledWith(true);
  });

  it('tap on compact pill expands the rack', async () => {
    jest.mocked(getTemporalRackCompact).mockResolvedValue(true);
    const { getByTestId, queryByTestId } = renderRack();

    await waitFor(() => {
      expect(getByTestId('temporal-month-rack-compact')).toBeTruthy();
    });
    fireEvent.press(getByTestId('temporal-month-rack-compact'));
    await waitFor(() => {
      expect(getByTestId('temporal-month-rack-expanded')).toBeTruthy();
    });
    expect(queryByTestId('temporal-month-rack-compact')).toBeNull();
    expect(setTemporalRackCompact).toHaveBeenCalledWith(false);
  });
});
