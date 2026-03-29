import { act, fireEvent, render, waitFor, within } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import * as entryRepository from '../../storage/entryRepository';
import * as firebaseAuthModule from '../../sync/firebaseAuth';
import * as firebaseConfig from '../../sync/firebaseConfig';
import * as syncQueueModule from '../../sync/syncQueue';

const mockOnAuthStateChanged = jest.fn();

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
}));

jest.mock('../../sync/firebaseAuth', () => ({
  getOrInitAuth: jest.fn(() => ({ currentUser: null })),
}));

jest.mock('../../sync/firebaseConfig', () => ({
  isFirebaseSyncConfigured: jest.fn(() => false),
}));

jest.mock('../../sync/tombstoneFlush', () => ({
  flushSyncTombstoneOutbox: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../sync/syncQueue', () => ({
  getPendingSyncCount: jest.fn(() => Promise.resolve(0)),
}));

jest.mock('../../sync/pushEntryForSync', () => ({
  resolvePushEntryForSync: jest.fn(() => jest.fn()),
}));

jest.mock('../../sync/syncEngine', () => ({
  processSyncQueue: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(() => Promise.resolve()),
}));

import { CaptureScreen } from '../CaptureScreen';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }),
}));

jest.mock('../../storage/entryRepository', () => ({
  saveEntry: jest.fn(() =>
    Promise.resolve({
      id: '1',
      text: 'hello',
      createdAt: '2025-01-01T00:00:00.000Z',
    })
  ),
  getRecentEntries: jest.fn(() => Promise.resolve([])),
  getEntriesOlderThan: jest.fn(() => Promise.resolve([])),
  searchEntriesForRecall: jest.fn(() => Promise.resolve({ entries: [], truncated: false })),
  deleteEntry: jest.fn(() => Promise.resolve()),
}));

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

describe('CaptureScreen', () => {
  beforeEach(() => {
    jest.mocked(entryRepository.saveEntry).mockImplementation(() =>
      Promise.resolve({
        id: '1',
        text: 'hello',
        createdAt: '2025-01-01T00:00:00.000Z',
      })
    );
    mockOnAuthStateChanged.mockReset();
    mockOnAuthStateChanged.mockImplementation(() => jest.fn());
    jest.mocked(firebaseConfig.isFirebaseSyncConfigured).mockReturnValue(false);
  });

  it('calls saveEntry with trimmed text on submit and clears the field after save succeeds', async () => {
    const { getByTestId, findByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <CaptureScreen />
      </SafeAreaProvider>
    );

    const input = await findByTestId('capture-input');
    fireEvent.changeText(input, '  hello  ');
    fireEvent(input, 'submitEditing');

    await waitFor(() => {
      expect(jest.mocked(entryRepository.saveEntry)).toHaveBeenCalledWith('hello');
    });

    await waitFor(() => {
      expect(getByTestId('capture-input').props.value).toBe('');
    });
  });

  it('refetches recent entries when externalEntriesEpoch increments', async () => {
    jest.mocked(entryRepository.getRecentEntries).mockClear();
    const { rerender, findByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <CaptureScreen externalEntriesEpoch={0} />
      </SafeAreaProvider>
    );
    await findByTestId('capture-input');
    const callsAfterMount = jest.mocked(entryRepository.getRecentEntries).mock.calls.length;
    rerender(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <CaptureScreen externalEntriesEpoch={1} />
      </SafeAreaProvider>
    );
    await waitFor(() => {
      expect(jest.mocked(entryRepository.getRecentEntries).mock.calls.length).toBeGreaterThan(
        callsAfterMount
      );
    });
  });

  it('requests focus on the capture field when captureFocusNonce increments', async () => {
    const focusSpy = jest.spyOn(TextInput.prototype, 'focus');
    try {
      const { rerender, findByTestId } = render(
        <SafeAreaProvider initialMetrics={safeAreaMetrics}>
          <CaptureScreen captureFocusNonce={0} />
        </SafeAreaProvider>
      );
      await findByTestId('capture-input');
      const afterMount = focusSpy.mock.calls.length;
      rerender(
        <SafeAreaProvider initialMetrics={safeAreaMetrics}>
          <CaptureScreen captureFocusNonce={1} />
        </SafeAreaProvider>
      );
      await waitFor(() => {
        expect(focusSpy.mock.calls.length).toBeGreaterThan(afterMount);
      });
    } finally {
      focusSpy.mockRestore();
    }
  });

  it('opens read sheet with full entry text when a recent row is pressed', async () => {
    const remoteEntry = {
      id: 'row-1',
      text: 'First line\nSecond line',
      createdAt: '2025-03-10T16:00:00.000Z',
    };
    jest.mocked(entryRepository.getRecentEntries).mockResolvedValueOnce([remoteEntry]);

    const { findByTestId, getByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <CaptureScreen />
      </SafeAreaProvider>
    );

    fireEvent.press(await findByTestId('recent-entry-row-1'));

    await waitFor(() => {
      expect(
        within(getByTestId('entry-read-sheet')).getByText('First line\nSecond line')
      ).toBeTruthy();
    });
  });

  it('keeps input text when saveEntry fails', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.mocked(entryRepository.saveEntry).mockRejectedValueOnce(new Error('disk full'));

    try {
      const { getByTestId, findByTestId } = render(
        <SafeAreaProvider initialMetrics={safeAreaMetrics}>
          <CaptureScreen />
        </SafeAreaProvider>
      );

      const input = await findByTestId('capture-input');
      fireEvent.changeText(input, '  my thought  ');
      fireEvent(input, 'submitEditing');

      await waitFor(() => {
        expect(jest.mocked(entryRepository.saveEntry)).toHaveBeenCalledWith('my thought');
      });

      await waitFor(() => {
        expect(getByTestId('capture-input').props.value).toBe('  my thought  ');
      });
    } finally {
      warn.mockRestore();
    }
  });

  it('shows search only after tapping the search toggle', async () => {
    jest.mocked(Haptics.impactAsync).mockClear();
    const { getByTestId, queryByTestId, findByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <CaptureScreen />
      </SafeAreaProvider>
    );

    await findByTestId('capture-input');
    expect(queryByTestId('stream-search-input')).toBeNull();
    expect(getByTestId('stream-search-toggle')).toBeTruthy();

    fireEvent.press(getByTestId('stream-search-toggle'));
    expect(getByTestId('stream-search-input')).toBeTruthy();
    expect(jest.mocked(Haptics.impactAsync)).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });

  it('debounces searchEntriesForRecall when search is expanded', async () => {
    jest.useFakeTimers();
    try {
      jest.mocked(entryRepository.searchEntriesForRecall).mockClear();
      const { getByTestId, findByTestId } = render(
        <SafeAreaProvider initialMetrics={safeAreaMetrics}>
          <CaptureScreen />
        </SafeAreaProvider>
      );

      await findByTestId('capture-input');
      fireEvent.press(getByTestId('stream-search-toggle'));
      fireEvent.changeText(getByTestId('stream-search-input'), 'needle');

      expect(jest.mocked(entryRepository.searchEntriesForRecall)).not.toHaveBeenCalled();

      await act(async () => {
        jest.advanceTimersByTime(250);
      });

      await waitFor(() => {
        expect(jest.mocked(entryRepository.searchEntriesForRecall)).toHaveBeenCalledWith(
          'needle',
          expect.any(Number)
        );
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('collapses search and clears query when close is pressed', async () => {
    jest.mocked(Haptics.impactAsync).mockClear();
    const { getByTestId, queryByTestId, findByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <CaptureScreen />
      </SafeAreaProvider>
    );

    await findByTestId('capture-input');
    fireEvent.press(getByTestId('stream-search-toggle'));
    fireEvent.changeText(getByTestId('stream-search-input'), 'temp');
    jest.mocked(Haptics.impactAsync).mockClear();

    fireEvent.press(getByTestId('stream-search-collapse'));

    expect(jest.mocked(Haptics.impactAsync)).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    expect(queryByTestId('stream-search-input')).toBeNull();
    fireEvent.press(getByTestId('stream-search-toggle'));
    expect(getByTestId('stream-search-input').props.value).toBe('');
  });
});

describe('CaptureScreen sync auth restore', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.mocked(firebaseConfig.isFirebaseSyncConfigured).mockReturnValue(true);
    jest.mocked(firebaseAuthModule.getOrInitAuth).mockReturnValue({ currentUser: null } as never);
    jest.mocked(syncQueueModule.getPendingSyncCount).mockResolvedValue(0);
    mockOnAuthStateChanged.mockReset();
    mockOnAuthStateChanged.mockImplementation(() => jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows checking sync status in header while auth is restoring (before first onAuthStateChanged)', async () => {
    mockOnAuthStateChanged.mockImplementation(() => jest.fn());

    const { getByTestId, findByTestId, getByText } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <CaptureScreen />
      </SafeAreaProvider>
    );

    await findByTestId('capture-input');
    expect(getByTestId('sync-header-cta')).toBeTruthy();
    expect(getByText('Checking sync')).toBeTruthy();
  });

  it('shows Synced in header when onAuthStateChanged fires with a non-anonymous user', async () => {
    let listener: ((user: unknown) => void) | undefined;
    mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
      listener = cb;
      return jest.fn();
    });

    const { getByTestId, findByTestId, getByText } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <CaptureScreen />
      </SafeAreaProvider>
    );

    await findByTestId('capture-input');
    expect(getByTestId('sync-header-cta')).toBeTruthy();

    await act(async () => {
      listener?.({
        uid: 'firebase-uid-1',
        isAnonymous: false,
        providerData: [{ providerId: 'apple.com' }],
      });
    });

    expect(getByTestId('sync-header-cta')).toBeTruthy();
    expect(getByText('Synced')).toBeTruthy();
  });

  it('shows Syncing… when signed in and upload queue has pending rows', async () => {
    jest.mocked(syncQueueModule.getPendingSyncCount).mockResolvedValue(2);
    let listener: ((user: unknown) => void) | undefined;
    mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
      listener = cb;
      return jest.fn();
    });

    const { getByTestId, findByTestId, getByText } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <CaptureScreen />
      </SafeAreaProvider>
    );

    await findByTestId('capture-input');

    await act(async () => {
      listener?.({
        uid: 'firebase-uid-1',
        isAnonymous: false,
        providerData: [{ providerId: 'apple.com' }],
      });
    });

    await waitFor(() => {
      expect(getByText('Syncing…')).toBeTruthy();
    });
    expect(getByTestId('sync-header-cta')).toBeTruthy();
  });

  it('shows Sync paused after repeated polls with a large pending queue', async () => {
    jest.useFakeTimers();
    try {
      jest.mocked(syncQueueModule.getPendingSyncCount).mockResolvedValue(6);
      let listener: ((user: unknown) => void) | undefined;
      mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
        listener = cb;
        return jest.fn();
      });

      const { findByTestId, getByText } = render(
        <SafeAreaProvider initialMetrics={safeAreaMetrics}>
          <CaptureScreen />
        </SafeAreaProvider>
      );

      await findByTestId('capture-input');

      await act(async () => {
        listener?.({
          uid: 'firebase-uid-1',
          isAnonymous: false,
          providerData: [{ providerId: 'apple.com' }],
        });
      });

      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        jest.advanceTimersByTime(2500);
        await Promise.resolve();
      });

      await act(async () => {
        jest.advanceTimersByTime(2500);
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(getByText('Sync paused')).toBeTruthy();
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('shows Enable sync in header after restore when user is anonymous only', async () => {
    let listener: ((user: unknown) => void) | undefined;
    mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
      listener = cb;
      return jest.fn();
    });

    const { getByTestId, findByTestId, getByText } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <CaptureScreen />
      </SafeAreaProvider>
    );

    await findByTestId('capture-input');

    await act(async () => {
      listener?.({
        uid: 'anon',
        isAnonymous: true,
        providerData: [],
      });
    });

    expect(getByTestId('sync-header-cta')).toBeTruthy();
    expect(getByText('Enable sync')).toBeTruthy();
  });

  it('shows Enable sync in header after restore completes with no signed-in user', async () => {
    let listener: ((user: unknown) => void) | undefined;
    mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
      listener = cb;
      return jest.fn();
    });

    const { getByTestId, findByTestId, getByText } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <CaptureScreen />
      </SafeAreaProvider>
    );

    await findByTestId('capture-input');
    expect(getByTestId('capture-input')).toBeTruthy();

    await act(async () => {
      listener?.(null);
    });

    expect(getByTestId('sync-header-cta')).toBeTruthy();
    expect(getByText('Enable sync')).toBeTruthy();
  });
});
