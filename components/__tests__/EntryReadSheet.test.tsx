import * as Clipboard from 'expo-clipboard';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
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
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

  it('does not show Open when text has no URL', () => {
    const { queryByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <EntryReadSheet visible entry={sampleEntry} onClose={jest.fn()} />
      </SafeAreaProvider>
    );

    expect(queryByTestId('entry-read-open-link')).toBeNull();
  });

  it('shows host and Open for a single URL; Open calls Linking.openURL', async () => {
    const entry = {
      id: 'e2',
      text: 'Read https://example.com/article today.',
      createdAt: '2025-06-15T14:30:00.000Z',
    };
    const { getByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <EntryReadSheet visible entry={entry} onClose={jest.fn()} />
      </SafeAreaProvider>
    );

    expect(getByTestId('entry-read-link-host').props.children).toBe('example.com');
    fireEvent.press(getByTestId('entry-read-open-link'));
    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith('https://example.com/article');
    });
  });

  it('uses comfortable reading layout when entry text is long', () => {
    const longText = 'word '.repeat(90);
    const entry = {
      id: 'e-long',
      text: longText,
      createdAt: sampleEntry.createdAt,
    };
    const { getByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <EntryReadSheet visible entry={entry} onClose={jest.fn()} />
      </SafeAreaProvider>
    );

    expect(getByTestId('entry-read-scroll').props.showsVerticalScrollIndicator).toBe(true);
    expect(getByTestId('entry-read-body').props.children).toBe(longText);
  });

  it('keeps compact read layout for shorter entries', () => {
    const { getByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <EntryReadSheet visible entry={sampleEntry} onClose={jest.fn()} />
      </SafeAreaProvider>
    );

    expect(getByTestId('entry-read-scroll').props.showsVerticalScrollIndicator).toBe(false);
  });

  it('Open uses first URL when several are present', async () => {
    const entry = {
      id: 'e3',
      text: 'https://a.com one https://b.com two',
      createdAt: '2025-06-15T14:30:00.000Z',
    };
    const { getByTestId, getByText } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <EntryReadSheet visible entry={entry} onClose={jest.fn()} />
      </SafeAreaProvider>
    );

    expect(getByTestId('entry-read-link-list')).toBeTruthy();
    expect(getByText('Links')).toBeTruthy();
    expect(getByText('1. https://a.com', { exact: false })).toBeTruthy();
    expect(getByText('2. https://b.com', { exact: false })).toBeTruthy();
    expect(getByText('Open uses link 1. Copy saves the full thought.')).toBeTruthy();
    fireEvent.press(getByTestId('entry-read-open-link'));
    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith('https://a.com');
    });
  });
});
