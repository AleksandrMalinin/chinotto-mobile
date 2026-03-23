import * as Clipboard from 'expo-clipboard';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { EntryReadSheet } from '../EntryReadSheet';

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }),
}));

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const sampleEntry = {
  id: 'e1',
  text: 'A longer thought that should appear in full inside the sheet.',
  createdAt: '2025-06-15T14:30:00.000Z',
};

describe('EntryReadSheet', () => {
  beforeEach(() => {
    jest.mocked(Clipboard.setStringAsync).mockClear();
  });

  it('renders full entry text when visible', () => {
    const { getByText, getByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <EntryReadSheet visible entry={sampleEntry} onClose={jest.fn()} />
      </SafeAreaProvider>
    );

    expect(getByTestId('entry-read-sheet')).toBeTruthy();
    expect(getByText(sampleEntry.text)).toBeTruthy();
  });

  it('copies entry text when Copy is pressed', async () => {
    const { getByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <EntryReadSheet visible entry={sampleEntry} onClose={jest.fn()} />
      </SafeAreaProvider>
    );

    fireEvent.press(getByTestId('entry-read-copy'));

    await waitFor(() => {
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith(sampleEntry.text);
    });
  });

  it('calls onClose when dismiss backdrop is pressed', () => {
    const onClose = jest.fn();
    const { getByLabelText } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <EntryReadSheet visible entry={sampleEntry} onClose={onClose} />
      </SafeAreaProvider>
    );

    fireEvent.press(getByLabelText('Dismiss'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
