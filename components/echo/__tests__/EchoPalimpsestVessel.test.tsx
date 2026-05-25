import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { EchoPalimpsestVessel } from '../EchoPalimpsestVessel';
import { echoChromeColors } from '../echoChrome';
import type { EchoCandidate } from '../../../utils/selectEchoCandidates';
import { formatEchoTemporalWhisper } from '../../../utils/formatEchoTemporalWhisper';

const candidates: EchoCandidate[] = [
  {
    id: '1',
    text: 'Top memory',
    createdAt: '2026-05-01T10:00:00.000Z',
    kind: 'gravity',
  },
  {
    id: '2',
    text: 'Middle ghost',
    createdAt: '2025-06-01T10:00:00.000Z',
    kind: 'drift',
  },
  {
    id: '3',
    text: 'Deep ghost',
    createdAt: '2025-01-01T10:00:00.000Z',
    kind: 'drift',
  },
];

const safeMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

describe('EchoPalimpsestVessel', () => {
  it('renders age-only rims and one full card', () => {
    const onEntryPress = jest.fn();
    const { getByTestId, getByText, queryByText } = render(
      <SafeAreaProvider initialMetrics={safeMetrics}>
        <EchoPalimpsestVessel
          candidates={candidates}
          chrome={echoChromeColors(true)}
          onEntryPress={onEntryPress}
        />
      </SafeAreaProvider>,
    );

    expect(getByTestId('echo-palimpsest-vessel')).toBeTruthy();
    expect(getByTestId('echo-palimpsest-rim-2')).toBeTruthy();
    expect(getByTestId('echo-palimpsest-rim-3')).toBeTruthy();
    expect(getByTestId('echo-palimpsest-primary-1')).toBeTruthy();
    expect(getByText('Top memory')).toBeTruthy();
    expect(
      getByText(formatEchoTemporalWhisper(candidates[0]!.createdAt)),
    ).toBeTruthy();
    expect(getByTestId('echo-palimpsest-rim-excerpt-2')).toHaveTextContent('Middle ghost');

    fireEvent.press(getByTestId('echo-palimpsest-primary-1'));
    expect(onEntryPress).toHaveBeenCalledWith(
      expect.objectContaining({ id: '1' }),
    );
  });

  it('long press cycles top card when reduce motion', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const { getByTestId } = render(
      <SafeAreaProvider initialMetrics={safeMetrics}>
        <EchoPalimpsestVessel
          candidates={candidates}
          chrome={echoChromeColors(true)}
        />
      </SafeAreaProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('echo-palimpsest-primary-1')).toBeTruthy();
    });

    fireEvent(getByTestId('echo-palimpsest-primary-1'), 'longPress');
    expect(getByTestId('echo-palimpsest-primary-2')).toBeTruthy();
    jest.restoreAllMocks();
  });

  it('resets peel stack when candidate pool changes', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const { getByTestId, rerender } = render(
      <SafeAreaProvider initialMetrics={safeMetrics}>
        <EchoPalimpsestVessel candidates={candidates} chrome={echoChromeColors(true)} />
      </SafeAreaProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('echo-palimpsest-primary-1')).toBeTruthy();
    });

    fireEvent(getByTestId('echo-palimpsest-primary-1'), 'longPress');
    await waitFor(() => {
      expect(getByTestId('echo-palimpsest-primary-2')).toBeTruthy();
    });

    rerender(
      <SafeAreaProvider initialMetrics={safeMetrics}>
        <EchoPalimpsestVessel
          candidates={[
            {
              id: '9',
              text: 'New pool top',
              createdAt: '2026-05-02T10:00:00.000Z',
              kind: 'gravity',
            },
            ...candidates.slice(1),
          ]}
          chrome={echoChromeColors(true)}
        />
      </SafeAreaProvider>,
    );

    expect(getByTestId('echo-palimpsest-primary-9')).toBeTruthy();
    jest.restoreAllMocks();
  });
});
