import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { EchoMemoryVessel } from '../EchoMemoryVessel';
import { echoChromeColors } from '../echoChrome';
import type { EchoCandidate } from '../../../utils/selectEchoCandidates';
import { formatEchoRelativeAge } from '../../../utils/formatEchoRelativeAge';

const candidates: EchoCandidate[] = [
  {
    id: '1',
    text: 'Persistent thought',
    createdAt: '2026-05-01T10:00:00.000Z',
    kind: 'gravity',
  },
  {
    id: '2',
    text: 'Older drift',
    createdAt: '2025-01-01T10:00:00.000Z',
    kind: 'drift',
  },
];

const safeMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

describe('EchoMemoryVessel', () => {
  it('renders one grouped register with editorial rows', () => {
    const { getByTestId, getByText, queryByText } = render(
      <SafeAreaProvider initialMetrics={safeMetrics}>
        <EchoMemoryVessel candidates={candidates} chrome={echoChromeColors(true)} />
      </SafeAreaProvider>,
    );

    expect(getByTestId('echo-memory-vessel')).toBeTruthy();
    expect(getByTestId('echo-fragment-1')).toBeTruthy();
    expect(getByTestId('echo-fragment-2')).toBeTruthy();
    expect(getByText('Persistent thought')).toBeTruthy();
    expect(getByText(formatEchoRelativeAge(candidates[0]!.createdAt))).toBeTruthy();
    expect(queryByText('Revisited')).toBeNull();
    expect(queryByText('Earlier')).toBeNull();
  });

  it('opens thought from row press', () => {
    const onEntryPress = jest.fn();
    const { getByTestId } = render(
      <SafeAreaProvider initialMetrics={safeMetrics}>
        <EchoMemoryVessel
          candidates={candidates}
          chrome={echoChromeColors(true)}
          onEntryPress={onEntryPress}
        />
      </SafeAreaProvider>,
    );

    fireEvent.press(getByTestId('echo-fragment-1'));
    expect(onEntryPress).toHaveBeenCalledWith(
      expect.objectContaining({ id: '1' }),
    );
  });
});
