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
  it('uses palimpsest vessel without scroll or explanatory headline', () => {
    const { getByTestId, queryByTestId, queryByText } = renderEcho();

    expect(getByTestId('echo-layer')).toBeTruthy();
    expect(getByTestId('echo-palimpsest-vessel')).toBeTruthy();
    expect(queryByTestId('echo-layer-scroll')).toBeNull();
    expect(queryByTestId('echo-layer-kicker')).toBeNull();
    expect(queryByTestId('echo-memory-vessel')).toBeNull();
    expect(queryByText('Thoughts that resurfaced over time.')).toBeNull();
    expect(queryByText('Revisited')).toBeNull();
    expect(queryByText('Earlier')).toBeNull();
  });

  it('opens thought from primary press', () => {
    const { getByTestId, onEntryPress } = renderEcho();

    fireEvent.press(getByTestId('echo-palimpsest-primary-1'));
    expect(onEntryPress).toHaveBeenCalledWith(
      expect.objectContaining({ id: '1' }),
      undefined,
    );
  });

  it('renders field vessel when uiVariant is field', () => {
    const { getByTestId, queryByTestId } = render(
      <SafeAreaProvider initialMetrics={safeMetrics}>
        <EchoLayer candidates={candidates} uiVariant="field" />
      </SafeAreaProvider>,
    );

    expect(getByTestId('echo-field-vessel')).toBeTruthy();
    expect(queryByTestId('echo-threshold-vessel')).toBeNull();
  });
});
