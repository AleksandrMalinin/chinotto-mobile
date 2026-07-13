import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Animated, Linking, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { EntryThoughtSheet } from '../EntryThoughtSheet';

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../storage/entryRepository', () => ({
  updateEntryText: jest.fn(() => Promise.resolve()),
  getAllEntries: jest.fn(() => Promise.resolve([])),
}));

jest.mock('../../storage/themeRepository', () => ({
  getEntryTheme: jest.fn(() => Promise.resolve(null)),
  setEntryTheme: jest.fn(() => Promise.resolve()),
}));

const mockToggleSheetVoice = jest.fn();
const mockStopSheetVoice = jest.fn();

jest.mock('../../src/features/voiceCapture/useVoiceDraftEdit', () => ({
  useVoiceDraftEdit: jest.fn(() => ({
    phase: 'idle',
    supported: true,
    toggleVoice: mockToggleSheetVoice,
    stopVoice: mockStopSheetVoice,
  })),
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

describe('EntryThoughtSheet', () => {
  beforeEach(() => {
    jest.mocked(Clipboard.setStringAsync).mockClear();
    mockToggleSheetVoice.mockClear();
    mockStopSheetVoice.mockClear();
    const { useVoiceDraftEdit } = require('../../src/features/voiceCapture/useVoiceDraftEdit') as {
      useVoiceDraftEdit: jest.Mock;
    };
    useVoiceDraftEdit.mockReturnValue({
      phase: 'idle',
      supported: true,
      toggleVoice: mockToggleSheetVoice,
      stopVoice: mockStopSheetVoice,
    });
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    jest.spyOn(Animated, 'spring').mockImplementation(() => ({ start: jest.fn() }) as never);
    jest.spyOn(Animated, 'timing').mockImplementation(
      () =>
        ({
          start: (callback?: (result: { finished: boolean }) => void) => {
            callback?.({ finished: true });
          },
        }) as never,
    );
    jest.spyOn(Animated, 'loop').mockImplementation(
      () =>
        ({
          start: jest.fn(),
          stop: jest.fn(),
        }) as never,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders full entry text when visible', () => {
    const { getByText, getByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <EntryThoughtSheet visible entry={sampleEntry} onClose={jest.fn()} />
      </SafeAreaProvider>
    );

    expect(getByTestId('entry-read-sheet')).toBeTruthy();
    expect(getByText(sampleEntry.text)).toBeTruthy();
  });

  it('plays haptic when hapticOnPresent is set on open', () => {
    jest.mocked(Haptics.impactAsync).mockClear();
    render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <EntryThoughtSheet
          visible
          entry={sampleEntry}
          onClose={jest.fn()}
          hapticOnPresent
        />
      </SafeAreaProvider>,
    );

    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });

  it('copies entry text when Copy is pressed', async () => {
    const { getByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <EntryThoughtSheet visible entry={sampleEntry} onClose={jest.fn()} />
      </SafeAreaProvider>
    );

    fireEvent.press(getByTestId('entry-read-copy'));

    await waitFor(() => {
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith(sampleEntry.text);
    });
  });

  it('calls onClose when dismiss backdrop is pressed in compact mode', async () => {
    const onClose = jest.fn();
    const { getByLabelText } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <EntryThoughtSheet visible entry={sampleEntry} onClose={onClose} />
      </SafeAreaProvider>
    );

    fireEvent.press(getByLabelText('Dismiss'));
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('does not dismiss from backdrop tap in full-screen continue mode', async () => {
    const onClose = jest.fn();
    const { getByTestId, getByLabelText } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <EntryThoughtSheet visible entry={sampleEntry} onClose={onClose} />
      </SafeAreaProvider>
    );

    const body = getByTestId('entry-read-body');
    fireEvent.press(body);
    fireEvent.press(body);
    fireEvent.press(getByLabelText('Dismiss'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not show Open when text has no URL', () => {
    const { queryByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <EntryThoughtSheet visible entry={sampleEntry} onClose={jest.fn()} />
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
        <EntryThoughtSheet visible entry={entry} onClose={jest.fn()} />
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
        <EntryThoughtSheet visible entry={entry} onClose={jest.fn()} />
      </SafeAreaProvider>
    );

    expect(getByTestId('entry-read-scroll').props.showsVerticalScrollIndicator).toBe(true);
    expect(getByTestId('entry-read-body').props.children).toBe(longText);
  });

  it('keeps compact read layout for shorter entries', () => {
    const { getByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <EntryThoughtSheet visible entry={sampleEntry} onClose={jest.fn()} />
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
        <EntryThoughtSheet visible entry={entry} onClose={jest.fn()} />
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

  it('pins sheet with flex column shell (no absolute bottom or KAV)', () => {
    const { getByTestId, toJSON } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <EntryThoughtSheet visible entry={sampleEntry} onClose={jest.fn()} />
      </SafeAreaProvider>
    );

    const sheet = getByTestId('entry-thought-sheet');
    const flat = StyleSheet.flatten(sheet.props.style);
    expect(flat.position).toBeUndefined();
    expect(flat.bottom).toBeUndefined();
    expect(flat.transform).toEqual([{ translateY: expect.anything() }]);

    const tree = JSON.stringify(toJSON());
    expect(tree).not.toContain('KeyboardAvoidingView');
  });

  it('shows a grabber affordance and Continue in compact mode', () => {
    const { getByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <EntryThoughtSheet visible entry={sampleEntry} onClose={jest.fn()} />
      </SafeAreaProvider>
    );

    expect(getByTestId('entry-thought-grabber')).toBeTruthy();
    expect(getByTestId('entry-thought-continue')).toBeTruthy();
  });

  it('expands into full-screen edit mode when Continue is pressed', () => {
    const { getByTestId, queryByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <EntryThoughtSheet visible entry={sampleEntry} onClose={jest.fn()} />
      </SafeAreaProvider>
    );

    fireEvent.press(getByTestId('entry-thought-continue'));
    expect(getByTestId('entry-thought-input')).toBeTruthy();
    expect(queryByTestId('entry-read-body')).toBeNull();
    expect(getByTestId('entry-thought-grabber-expanded')).toBeTruthy();
  });

  it('expands into full-screen edit mode on double tap of the body', () => {
    const { getByTestId, queryByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <EntryThoughtSheet visible entry={sampleEntry} onClose={jest.fn()} />
      </SafeAreaProvider>
    );

    const body = getByTestId('entry-read-body');
    fireEvent.press(body);
    fireEvent.press(body);
    expect(getByTestId('entry-thought-input')).toBeTruthy();
    expect(queryByTestId('entry-read-body')).toBeNull();
    expect(getByTestId('entry-thought-grabber-expanded')).toBeTruthy();
    expect(queryByTestId('entry-thought-grabber')).toBeNull();

    const sheet = getByTestId('entry-thought-sheet');
    const flat = StyleSheet.flatten(sheet.props.style);
    expect(flat.borderTopLeftRadius).toBe(0);
    expect(flat.flex).toBe(1);
  });

  it('shows sheet voice mic in edit mode', () => {
    const { getByTestId, getByRole } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <EntryThoughtSheet visible entry={sampleEntry} onClose={jest.fn()} />
      </SafeAreaProvider>,
    );

    const body = getByTestId('entry-read-body');
    fireEvent.press(body);
    fireEvent.press(body);
    expect(getByRole('button', { name: 'Speak thought' })).toBeTruthy();
  });

  it('shows thread panel when related neighbors exist', async () => {
    const { getAllEntries } = require('../../storage/entryRepository') as {
      getAllEntries: jest.Mock;
    };
    const entry = {
      id: 'e1',
      text: 'api refactor error handling',
      createdAt: '2025-06-15T14:30:00.000Z',
    };
    getAllEntries.mockResolvedValueOnce([
      {
        id: 'e0',
        text: 'api refactor draft notes',
        createdAt: '2025-06-10T10:00:00.000Z',
      },
      entry,
      {
        id: 'e2',
        text: 'error handling release plan',
        createdAt: '2025-06-20T10:00:00.000Z',
      },
    ]);

    const { findByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <EntryThoughtSheet visible entry={entry} onClose={jest.fn()} />
      </SafeAreaProvider>,
    );

    expect(await findByTestId('thought-thread-panel')).toBeTruthy();
  });

  it('shows listening bar while sheet voice is active', () => {
    const { useVoiceDraftEdit } = require('../../src/features/voiceCapture/useVoiceDraftEdit') as {
      useVoiceDraftEdit: jest.Mock;
    };
    useVoiceDraftEdit.mockReturnValue({
      phase: 'listening',
      supported: true,
      toggleVoice: mockToggleSheetVoice,
      stopVoice: mockStopSheetVoice,
    });

    const { getByTestId, getByText } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <EntryThoughtSheet visible entry={sampleEntry} onClose={jest.fn()} />
      </SafeAreaProvider>,
    );

    const body = getByTestId('entry-read-body');
    fireEvent.press(body);
    fireEvent.press(body);

    expect(getByTestId('voice-listening-bar')).toBeTruthy();
    expect(getByText('Tap mic when done')).toBeTruthy();
  });
});
