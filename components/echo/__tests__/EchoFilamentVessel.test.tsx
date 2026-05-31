import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { EchoFilamentVessel } from '../EchoFilamentVessel';
import { echoChromeColors } from '../echoChrome';
import type { EchoCandidate } from '../../../utils/selectEchoCandidates';

const candidates: EchoCandidate[] = [
  {
    id: '1',
    text: 'First station thought',
    createdAt: '2026-05-01T10:00:00.000Z',
    kind: 'gravity',
  },
  {
    id: '2',
    text: 'Second linked thought',
    createdAt: '2026-05-02T10:00:00.000Z',
    kind: 'drift',
  },
];

const safeMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

describe('EchoFilamentVessel', () => {
  it('renders thread track and active station', () => {
    const onEntryPress = jest.fn();
    const { getByTestId, getByText } = render(
      <SafeAreaProvider initialMetrics={safeMetrics}>
        <EchoFilamentVessel
          candidates={candidates}
          chrome={echoChromeColors(true)}
          onEntryPress={onEntryPress}
        />
      </SafeAreaProvider>,
    );

    expect(getByTestId('echo-filament-vessel')).toBeTruthy();
    expect(getByTestId('echo-filament-track')).toBeTruthy();
    expect(getByText('First station thought')).toBeTruthy();

    fireEvent.press(getByTestId('echo-filament-station-1'));
    expect(onEntryPress).toHaveBeenCalledWith(
      expect.objectContaining({ id: '1' }),
    );
  });

  it('switches station when dot pressed', () => {
    const { getByTestId, getByText } = render(
      <SafeAreaProvider initialMetrics={safeMetrics}>
        <EchoFilamentVessel candidates={candidates} chrome={echoChromeColors(true)} />
      </SafeAreaProvider>,
    );

    fireEvent.press(getByTestId('echo-filament-dot-2'));
    expect(getByText('Second linked thought')).toBeTruthy();
  });
});
