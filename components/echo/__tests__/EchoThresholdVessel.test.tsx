import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { EchoThresholdVessel } from '../EchoThresholdVessel';
import { echoChromeColors } from '../echoChrome';
import type { EchoCandidate } from '../../../utils/selectEchoCandidates';

const candidates: EchoCandidate[] = [
  {
    id: '1',
    text: 'Primary presence thought',
    createdAt: '2026-05-01T10:00:00.000Z',
    kind: 'gravity',
  },
  {
    id: '2',
    text: 'Ghost trace one',
    createdAt: '2025-01-01T10:00:00.000Z',
    kind: 'drift',
  },
  {
    id: '3',
    text: 'Ghost trace two',
    createdAt: '2025-02-01T10:00:00.000Z',
    kind: 'drift',
  },
];

const safeMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

describe('EchoThresholdVessel', () => {
  it('shows one primary and up to two ghost traces', () => {
    const { getByTestId, queryByTestId } = render(
      <SafeAreaProvider initialMetrics={safeMetrics}>
        <EchoThresholdVessel candidates={candidates} chrome={echoChromeColors(true)} />
      </SafeAreaProvider>,
    );

    expect(getByTestId('echo-threshold-vessel')).toBeTruthy();
    expect(getByTestId('echo-threshold-primary-1')).toBeTruthy();
    expect(getByTestId('echo-threshold-ghost-2')).toBeTruthy();
    expect(getByTestId('echo-threshold-ghost-3')).toBeTruthy();
    expect(queryByTestId('echo-fragment-1')).toBeNull();
  });

  it('opens thought from primary press only', () => {
    const onEntryPress = jest.fn();
    const { getByTestId } = render(
      <SafeAreaProvider initialMetrics={safeMetrics}>
        <EchoThresholdVessel
          candidates={candidates}
          chrome={echoChromeColors(true)}
          onEntryPress={onEntryPress}
        />
      </SafeAreaProvider>,
    );

    fireEvent.press(getByTestId('echo-threshold-primary-1'));
    expect(onEntryPress).toHaveBeenCalledWith(
      expect.objectContaining({ id: '1' }),
    );
  });
});
