import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { EchoLayer } from '../EchoLayer';
import type { EchoCandidate } from '../../../utils/selectEchoCandidates';

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

function renderEcho() {
  const onEntryPress = jest.fn();
  const view = render(
    <SafeAreaProvider initialMetrics={safeMetrics}>
      <EchoLayer candidates={candidates} onEntryPress={onEntryPress} />
    </SafeAreaProvider>,
  );
  return { ...view, onEntryPress };
}

describe('EchoLayer', () => {
  it('reads as stacked memory fragments, not stream rows or kind badges', () => {
    const { getByTestId, queryByTestId, queryByText } = renderEcho();

    expect(getByTestId('echo-layer-kicker').props.children).toBe('Echo');
    expect(getByTestId('echo-layer-caption').props.children).toBe(
      'Thoughts that resurfaced over time.',
    );
    expect(queryByTestId('echo-layer-title')).toBeNull();
    expect(getByTestId('echo-memory-vessel')).toBeTruthy();
    expect(getByTestId('echo-fragment-1')).toBeTruthy();
    expect(queryByTestId('echo-header-logo')).toBeNull();
    expect(queryByTestId('echo-entry-1')).toBeNull();
    expect(queryByTestId('echo-ambience')).toBeNull();
    expect(queryByText('Revisited')).toBeNull();
    expect(queryByText('Earlier')).toBeNull();
  });

  it('opens thought from fragment press', () => {
    const { getByTestId, onEntryPress } = renderEcho();

    fireEvent.press(getByTestId('echo-fragment-1'));
    expect(onEntryPress).toHaveBeenCalledWith(
      expect.objectContaining({ id: '1' }),
      undefined,
    );
  });
});
