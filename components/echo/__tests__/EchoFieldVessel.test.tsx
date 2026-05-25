import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { EchoFieldVessel } from '../EchoFieldVessel';
import { echoChromeColors } from '../echoChrome';
import type { EchoCandidate } from '../../../utils/selectEchoCandidates';

const candidates: EchoCandidate[] = [
  {
    id: '1',
    text: 'Center gravity thought',
    createdAt: '2026-05-01T10:00:00.000Z',
    kind: 'gravity',
  },
  {
    id: '2',
    text: 'Peripheral drift thought',
    createdAt: '2026-05-02T10:00:00.000Z',
    kind: 'drift',
  },
];

const safeMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

describe('EchoFieldVessel', () => {
  it('renders field nodes after layout', () => {
    const { getByTestId, getByText } = render(
      <SafeAreaProvider initialMetrics={safeMetrics}>
        <EchoFieldVessel candidates={candidates} chrome={echoChromeColors(true)} />
      </SafeAreaProvider>,
    );

    fireEvent(getByTestId('echo-field-viewport'), 'layout', {
      nativeEvent: { layout: { width: 360, height: 320, x: 0, y: 0 } },
    });

    expect(getByTestId('echo-field-node-1')).toBeTruthy();
    expect(getByTestId('echo-field-node-2')).toBeTruthy();
    expect(getByText('Center gravity thought')).toBeTruthy();
  });

  it('focuses satellite on first tap and opens on second tap', () => {
    const onEntryPress = jest.fn();
    const { getByTestId } = render(
      <SafeAreaProvider initialMetrics={safeMetrics}>
        <EchoFieldVessel
          candidates={candidates}
          chrome={echoChromeColors(true)}
          onEntryPress={onEntryPress}
        />
      </SafeAreaProvider>,
    );

    fireEvent(getByTestId('echo-field-viewport'), 'layout', {
      nativeEvent: { layout: { width: 360, height: 320, x: 0, y: 0 } },
    });

    fireEvent.press(getByTestId('echo-field-node-2'));
    expect(onEntryPress).not.toHaveBeenCalled();

    fireEvent.press(getByTestId('echo-field-node-2'));
    expect(onEntryPress).toHaveBeenCalledWith(
      expect.objectContaining({ id: '2' }),
    );
  });

  it('opens primary on tap when already focused', () => {
    const onEntryPress = jest.fn();
    const { getByTestId } = render(
      <SafeAreaProvider initialMetrics={safeMetrics}>
        <EchoFieldVessel
          candidates={candidates}
          chrome={echoChromeColors(true)}
          onEntryPress={onEntryPress}
        />
      </SafeAreaProvider>,
    );

    fireEvent(getByTestId('echo-field-viewport'), 'layout', {
      nativeEvent: { layout: { width: 360, height: 320, x: 0, y: 0 } },
    });

    fireEvent.press(getByTestId('echo-field-node-1'));
    expect(onEntryPress).toHaveBeenCalledWith(
      expect.objectContaining({ id: '1' }),
    );
  });
});
