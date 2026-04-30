import { act, fireEvent, render, waitFor, within } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import * as entryRepository from '../../storage/entryRepository';
import * as syncHeaderShimmerPrefs from '../../storage/syncHeaderShimmerPrefs';
import * as syncHighlightSignals from '../../storage/syncHighlightSignals';
import { SYNC_HIGHLIGHT_SCHEDULE_DELAY_MS } from '../../sync/syncHighlightConstants';
import * as firebaseAuthModule from '../../sync/firebaseAuth';
import * as firebaseConfig from '../../sync/firebaseConfig';
import * as syncQueueModule from '../../sync/syncQueue';
import * as firestoreMirror from '../../sync/firestoreSyncAccessMirror';
import * as devMenuModule from '../../dev/showDevMenu';

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

const demoStreamModeState = { enabled: false };
jest.mock('../../src/features/demoStreamMode', () => ({
  isDemoStreamMode: () => demoStreamModeState.enabled,
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

jest.mock('../../dev/showDevMenu', () => ({
  showDevMenu: jest.fn(),
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../storage/settingsPrefs', () => ({
  getHapticsEnabled: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('../../storage/firstLaunchCapturePrefs', () => ({
  getFirstLaunchEmptyCaptureRevealDone: jest.fn(() => Promise.resolve(true)),
  getFirstLaunchComposerHasFocused: jest.fn(() => Promise.resolve(true)),
  setFirstLaunchEmptyCaptureRevealDone: jest.fn(() => Promise.resolve()),
  setFirstLaunchComposerHasFocused: jest.fn(() => Promise.resolve()),
  clearFirstLaunchEmptyCaptureRevealDone: jest.fn(() => Promise.resolve()),
}));

jest.mock('../DeleteAccountScreen', () => ({
  DeleteAccountScreen: () => null,
}));

import { CaptureScreen } from '../CaptureScreen';
import * as settingsPrefs from '../../storage/settingsPrefs';
import * as firstLaunchCapturePrefs from '../../storage/firstLaunchCapturePrefs';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }),
}));

jest.mock('../../storage/syncHeaderShimmerPrefs', () => ({
  hasSyncHeaderCtaBeenTapped: jest.fn(() => Promise.resolve(false)),
  recordSyncHeaderCtaTapped: jest.fn(() => Promise.resolve()),
  resetSyncHeaderShimmerPrefsForDev: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../storage/syncHighlightSignals', () => ({
  loadSyncHighlightSignals: jest.fn(() =>
    Promise.resolve({
      appLaunchCount: 1,
      shimmerImpressionCount: 0,
      lastShimmerAt: null,
      hasDeepScrolledStream: false,
      hasOpenedExistingThought: false,
      hasUsedSearch: false,
    })
  ),
  recordStreamDeepScrolledForSyncHighlight: jest.fn(() => Promise.resolve()),
  recordOpenedExistingThoughtForSyncHighlight: jest.fn(() => Promise.resolve()),
  recordSearchUsedForSyncHighlight: jest.fn(() => Promise.resolve()),
  recordSyncShimmerImpression: jest.fn(() => Promise.resolve()),
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
  getEntryCount: jest.fn(() => Promise.resolve(0)),
  searchEntriesForRecall: jest.fn(() => Promise.resolve({ entries: [], truncated: false })),
  deleteEntry: jest.fn(() => Promise.resolve()),
}));

/** Empty stream mounts `StreamFlowPanel`; real panel schedules long animations — unsafe for Jest teardown. */
jest.mock('../../components/StreamFlowPanel', () => ({
  StreamFlowPanel: () => null,
}));

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const STREAM_SEARCH_SEED_ENTRY = {
  id: 'search-seed',
  text: 'seed thought',
  createdAt: '2025-01-01T12:00:00.000Z',
};

describe('CaptureScreen', () => {
  beforeEach(() => {
    jest.mocked(entryRepository.saveEntry).mockReset();
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
    jest.mocked(settingsPrefs.getHapticsEnabled).mockImplementation(() => Promise.resolve(true));
    jest.mocked(entryRepository.getRecentEntries).mockImplementation(() => Promise.resolve([]));
    jest.mocked(firstLaunchCapturePrefs.getFirstLaunchEmptyCaptureRevealDone).mockImplementation(() =>
      Promise.resolve(true)
    );
    jest.mocked(firstLaunchCapturePrefs.getFirstLaunchComposerHasFocused).mockImplementation(() =>
      Promise.resolve(true)
    );
  });

  it('disables composer autoFocus on first launch until empty-stream reveal flag is set', async () => {
    /** Defer resolve so prefs stay pending while `firstLaunchRevealDone` is null (defer keyboard). */
    let resolveReveal!: (v: boolean) => void;
    const revealPending = new Promise<boolean>((resolve) => {
      resolveReveal = resolve;
    });
    jest.mocked(firstLaunchCapturePrefs.getFirstLaunchEmptyCaptureRevealDone).mockImplementation(() =>
      revealPending
    );

    const { findByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <CaptureScreen />
      </SafeAreaProvider>
    );

    const input = await findByTestId('capture-input');
    expect(input.props.autoFocus).toBe(false);
    await act(async () => {
      resolveReveal(false);
    });
  });

  it('disables composer autoFocus while allowCaptureFocus is false', async () => {
    const { findByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <CaptureScreen allowCaptureFocus={false} />
      </SafeAreaProvider>
    );

    const input = await findByTestId('capture-input');
    expect(input.props.autoFocus).toBe(false);
  });

  it('calls onAnalyticsPresentationGateReady once the stream has at least one entry', async () => {
    jest.mocked(entryRepository.getRecentEntries).mockImplementation(() =>
      Promise.resolve([
        {
          id: 'seed',
          text: 'hello',
          createdAt: '2025-01-01T00:00:00.000Z',
        },
      ])
    );
    const onGate = jest.fn();
    render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <CaptureScreen allowCaptureFocus onAnalyticsPresentationGateReady={onGate} />
      </SafeAreaProvider>
    );

    await waitFor(() => {
      expect(onGate).toHaveBeenCalledTimes(1);
    });
  });

  it('does not call onAnalyticsPresentationGateReady while allowCaptureFocus is false', async () => {
    const onGate = jest.fn();
    render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <CaptureScreen allowCaptureFocus={false} onAnalyticsPresentationGateReady={onGate} />
      </SafeAreaProvider>
    );

    await waitFor(() => {
      expect(onGate).not.toHaveBeenCalled();
    });
  });

  it('does not call onAnalyticsPresentationGateReady while the stream is empty', async () => {
    const onGate = jest.fn();
    render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <CaptureScreen allowCaptureFocus onAnalyticsPresentationGateReady={onGate} />
      </SafeAreaProvider>
    );

    await waitFor(() => {
      expect(onGate).not.toHaveBeenCalled();
    });
  });

  it('calls saveEntry with trimmed text on submit and clears the field after save succeeds', async () => {
    jest.mocked(Haptics.impactAsync).mockClear();
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

    await waitFor(() => {
      expect(jest.mocked(Haptics.impactAsync)).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });
  });

  it('does not play thought-saved haptic when haptics are disabled in settings', async () => {
    jest.mocked(settingsPrefs.getHapticsEnabled).mockImplementationOnce(() => Promise.resolve(false));
    jest.mocked(Haptics.impactAsync).mockClear();

    const { getByTestId, findByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <CaptureScreen />
      </SafeAreaProvider>
    );

    const input = await findByTestId('capture-input');
    fireEvent.changeText(input, '  quiet  ');
    fireEvent(input, 'submitEditing');

    await waitFor(() => {
      expect(jest.mocked(entryRepository.saveEntry)).toHaveBeenCalledWith('quiet');
    });

    await waitFor(() => {
      expect(getByTestId('capture-input').props.value).toBe('');
    });

    expect(jest.mocked(Haptics.impactAsync)).not.toHaveBeenCalled();
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

  it('defers captureFocusNonce focus until allowCaptureFocus becomes true', async () => {
    const focusSpy = jest.spyOn(TextInput.prototype, 'focus');
    try {
      const { rerender, findByTestId } = render(
        <SafeAreaProvider initialMetrics={safeAreaMetrics}>
          <CaptureScreen captureFocusNonce={0} allowCaptureFocus={false} />
        </SafeAreaProvider>
      );
      await findByTestId('capture-input');
      const afterMount = focusSpy.mock.calls.length;

      rerender(
        <SafeAreaProvider initialMetrics={safeAreaMetrics}>
          <CaptureScreen captureFocusNonce={1} allowCaptureFocus={false} />
        </SafeAreaProvider>
      );

      await act(async () => {
        await Promise.resolve();
      });
      expect(focusSpy.mock.calls.length).toBe(afterMount);

      rerender(
        <SafeAreaProvider initialMetrics={safeAreaMetrics}>
          <CaptureScreen captureFocusNonce={1} allowCaptureFocus />
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
      jest.mocked(Haptics.impactAsync).mockClear();
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

      expect(jest.mocked(Haptics.impactAsync)).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('hides stream search when there are no thoughts', async () => {
    const { queryByTestId, findByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <CaptureScreen />
      </SafeAreaProvider>
    );

    await findByTestId('capture-input');
    expect(queryByTestId('stream-search-toggle')).toBeNull();
  });

  it('shows Write peek after the stream scrolls past the capture area', async () => {
    jest
      .mocked(entryRepository.getRecentEntries)
      .mockImplementation(() => Promise.resolve([STREAM_SEARCH_SEED_ENTRY]));
    const { findByTestId, getByTestId, queryByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <CaptureScreen />
      </SafeAreaProvider>
    );

    await findByTestId('capture-input');
    await waitFor(() => {
      expect(getByTestId('capture-stream-scroll')).toBeTruthy();
    });
    const scrollView = getByTestId('capture-stream-scroll');
    fireEvent.scroll(scrollView, {
      nativeEvent: {
        contentOffset: { x: 0, y: 0 },
        layoutMeasurement: { height: 600, width: 390 },
        contentSize: { height: 2000, width: 390 },
      },
    });
    fireEvent.scroll(scrollView, {
      nativeEvent: {
        contentOffset: { x: 0, y: 200 },
        layoutMeasurement: { height: 600, width: 390 },
        contentSize: { height: 2000, width: 390 },
      },
    });

    await waitFor(() => {
      expect(queryByTestId('capture-chrome-peek')).toBeTruthy();
    });
  });

  it('Write peek scrolls toward capture and focuses the field', async () => {
    jest
      .mocked(entryRepository.getRecentEntries)
      .mockImplementation(() => Promise.resolve([STREAM_SEARCH_SEED_ENTRY]));
    const focusSpy = jest.spyOn(TextInput.prototype, 'focus');
    try {
      const { findByTestId, getByTestId } = render(
        <SafeAreaProvider initialMetrics={safeAreaMetrics}>
          <CaptureScreen />
        </SafeAreaProvider>
      );

      await findByTestId('capture-input');
      const scrollView = getByTestId('capture-stream-scroll');
      fireEvent.scroll(scrollView, {
        nativeEvent: {
          contentOffset: { x: 0, y: 0 },
          layoutMeasurement: { height: 600, width: 390 },
          contentSize: { height: 2000, width: 390 },
        },
      });
      fireEvent.scroll(scrollView, {
        nativeEvent: {
          contentOffset: { x: 0, y: 200 },
          layoutMeasurement: { height: 600, width: 390 },
          contentSize: { height: 2000, width: 390 },
        },
      });
      await waitFor(() => {
        expect(getByTestId('capture-chrome-peek')).toBeTruthy();
      });
      const callsBefore = focusSpy.mock.calls.length;
      fireEvent.press(getByTestId('capture-chrome-peek'));
      await waitFor(() => {
        expect(focusSpy.mock.calls.length).toBeGreaterThan(callsBefore);
      });
    } finally {
      focusSpy.mockRestore();
    }
  });

  it('shows search only after tapping the search toggle', async () => {
    jest.mocked(Haptics.impactAsync).mockClear();
    jest
      .mocked(entryRepository.getRecentEntries)
      .mockImplementation(() => Promise.resolve([STREAM_SEARCH_SEED_ENTRY]));
    const { getByTestId, queryByTestId, findByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <CaptureScreen />
      </SafeAreaProvider>
    );

    await findByTestId('capture-input');
    await waitFor(() => {
      expect(getByTestId('stream-search-toggle')).toBeTruthy();
    });
    expect(queryByTestId('stream-search-input')).toBeNull();

    fireEvent.press(getByTestId('stream-search-toggle'));
    expect(getByTestId('stream-search-input')).toBeTruthy();
    expect(jest.mocked(Haptics.impactAsync)).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });

  it('debounces searchEntriesForRecall when search is expanded', async () => {
    jest.useFakeTimers();
    try {
      jest.mocked(entryRepository.searchEntriesForRecall).mockClear();
      jest
        .mocked(entryRepository.getRecentEntries)
        .mockImplementation(() => Promise.resolve([STREAM_SEARCH_SEED_ENTRY]));
      const { getByTestId, findByTestId } = render(
        <SafeAreaProvider initialMetrics={safeAreaMetrics}>
          <CaptureScreen />
        </SafeAreaProvider>
      );

      await findByTestId('capture-input');
      await waitFor(() => {
        expect(getByTestId('stream-search-toggle')).toBeTruthy();
      });
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
    jest
      .mocked(entryRepository.getRecentEntries)
      .mockImplementation(() => Promise.resolve([STREAM_SEARCH_SEED_ENTRY]));
    const { getByTestId, queryByTestId, findByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <CaptureScreen />
      </SafeAreaProvider>
    );

    await findByTestId('capture-input');
    await waitFor(() => {
      expect(getByTestId('stream-search-toggle')).toBeTruthy();
    });
    fireEvent.press(getByTestId('stream-search-toggle'));
    fireEvent.changeText(getByTestId('stream-search-input'), 'temp');
    jest.mocked(Haptics.impactAsync).mockClear();

    fireEvent.press(getByTestId('stream-search-collapse'));

    expect(jest.mocked(Haptics.impactAsync)).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    expect(queryByTestId('stream-search-input')).toBeNull();
    fireEvent.press(getByTestId('stream-search-toggle'));
    expect(getByTestId('stream-search-input').props.value).toBe('');
  });

  it('opens Settings when the header logo is tapped', async () => {
    const { findByTestId, getByTestId, queryByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <CaptureScreen />
      </SafeAreaProvider>
    );

    await findByTestId('capture-input');
    fireEvent.press(getByTestId('header-logo'));

    expect(getByTestId('settings-screen')).toBeTruthy();

    fireEvent.press(getByTestId('settings-logo'));
    expect(queryByTestId('settings-screen')).toBeNull();
  });

  it('opens dev menu from Settings instead of the main header', async () => {
    const RN = require('react-native');
    const prevOs = RN.Platform.OS;
    RN.Platform.OS = 'ios';
    jest.mocked(devMenuModule.showDevMenu).mockClear();

    try {
      const { findByTestId, getByTestId } = render(
        <SafeAreaProvider initialMetrics={safeAreaMetrics}>
          <CaptureScreen />
        </SafeAreaProvider>
      );

      await findByTestId('capture-input');
      fireEvent.press(getByTestId('header-logo'));
      fireEvent.press(getByTestId('settings-open-dev-menu'));

      expect(jest.mocked(devMenuModule.showDevMenu)).toHaveBeenCalledTimes(1);
    } finally {
      RN.Platform.OS = prevOs;
    }
  });

  it('does not let a late mount prefs read overwrite dev reset of first-launch reveal', async () => {
    const RN = require('react-native');
    const prevOs = RN.Platform.OS;
    RN.Platform.OS = 'ios';
    jest.mocked(devMenuModule.showDevMenu).mockClear();

    let resolveGet: ((value: boolean) => void) | undefined;
    jest.mocked(firstLaunchCapturePrefs.getFirstLaunchEmptyCaptureRevealDone).mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolveGet = resolve;
        })
    );

    try {
      const { findByTestId, getByTestId } = render(
        <SafeAreaProvider initialMetrics={safeAreaMetrics}>
          <CaptureScreen />
        </SafeAreaProvider>
      );

      await findByTestId('capture-input');
      fireEvent.press(getByTestId('header-logo'));
      fireEvent.press(getByTestId('settings-open-dev-menu'));

      const opts = jest.mocked(devMenuModule.showDevMenu).mock.calls[0][0];
      await act(async () => {
        opts.onResetSyncCaptureQA?.();
      });

      await act(async () => {
        resolveGet?.(true);
      });

      await waitFor(() => {
        expect(getByTestId('capture-input').props.autoFocus).toBe(false);
      });
    } finally {
      RN.Platform.OS = prevOs;
    }
  });

  it('opens manifesto from Settings and closes back to Settings', async () => {
    const { findByTestId, getByTestId, queryByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <CaptureScreen />
      </SafeAreaProvider>
    );

    await findByTestId('capture-input');
    fireEvent.press(getByTestId('header-logo'));
    fireEvent.press(getByTestId('settings-open-manifesto'));

    expect(getByTestId('manifesto-screen')).toBeTruthy();

    fireEvent.press(getByTestId('manifesto-logo'));

    expect(queryByTestId('manifesto-screen')).toBeNull();
    expect(getByTestId('settings-screen')).toBeTruthy();
  });

  it('hides app icon picker entry in Settings when feature flag is off', async () => {
    const { findByTestId, getByTestId, queryByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <CaptureScreen />
      </SafeAreaProvider>
    );

    await findByTestId('capture-input');
    fireEvent.press(getByTestId('header-logo'));

    expect(queryByTestId('settings-open-app-icon')).toBeNull();
    expect(queryByTestId('app-icon-screen')).toBeNull();
  });
});

describe('CaptureScreen enable sync label shimmer', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.mocked(firebaseConfig.isFirebaseSyncConfigured).mockReturnValue(true);
    jest.mocked(firebaseAuthModule.getOrInitAuth).mockReturnValue({ currentUser: null } as never);
    mockOnAuthStateChanged.mockReset();
    jest.mocked(syncHighlightSignals.loadSyncHighlightSignals).mockResolvedValue({
      appLaunchCount: 3,
      shimmerImpressionCount: 0,
      lastShimmerAt: null,
      hasDeepScrolledStream: false,
      hasOpenedExistingThought: false,
      hasUsedSearch: false,
    });
    jest.mocked(entryRepository.getEntryCount).mockResolvedValue(0);
    jest.mocked(syncHeaderShimmerPrefs.hasSyncHeaderCtaBeenTapped).mockResolvedValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('schedules one-shot shimmer after contextual delay when eligible', async () => {
    jest.useFakeTimers();
    try {
      let listener: ((user: unknown) => void) | undefined;
      mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
        listener = cb;
        return jest.fn();
      });

      const { findByTestId, getByTestId, queryByTestId } = render(
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

      expect(queryByTestId('enable-sync-label-shimmer')).toBeNull();

      await act(async () => {
        jest.advanceTimersByTime(SYNC_HIGHLIGHT_SCHEDULE_DELAY_MS);
      });
      await act(async () => {
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(getByTestId('enable-sync-label-shimmer')).toBeTruthy();
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not show shimmer if sync header was tapped before the delay elapses', async () => {
    jest.useFakeTimers();
    try {
      let listener: ((user: unknown) => void) | undefined;
      mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
        listener = cb;
        return jest.fn();
      });

      const { findByTestId, getByTestId, queryByTestId } = render(
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

      fireEvent.press(getByTestId('sync-header-cta'));
      jest.mocked(syncHeaderShimmerPrefs.hasSyncHeaderCtaBeenTapped).mockResolvedValue(true);

      await act(async () => {
        jest.advanceTimersByTime(SYNC_HIGHLIGHT_SCHEDULE_DELAY_MS);
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(queryByTestId('enable-sync-label-shimmer')).toBeNull();
      expect(jest.mocked(syncHeaderShimmerPrefs.recordSyncHeaderCtaTapped)).toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('CaptureScreen sync auth restore', () => {
  beforeEach(() => {
    demoStreamModeState.enabled = false;
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.mocked(firebaseConfig.isFirebaseSyncConfigured).mockReturnValue(true);
    jest.mocked(firebaseAuthModule.getOrInitAuth).mockReturnValue({ currentUser: null } as never);
    jest.mocked(syncQueueModule.getPendingSyncCount).mockResolvedValue(0);
    mockOnAuthStateChanged.mockReset();
    mockOnAuthStateChanged.mockImplementation(() => jest.fn());
  });

  afterEach(() => {
    demoStreamModeState.enabled = false;
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

  it('mirrors chinottoSyncAccess to Firestore when subscription hydrates after user is signed in', async () => {
    const RN = require('react-native');
    const prevOs = RN.Platform.OS;
    RN.Platform.OS = 'ios';
    const mirror = jest.mocked(firestoreMirror.mirrorChinottoSyncAccessToFirestore);
    mirror.mockClear();

    let listener: ((user: unknown) => void) | undefined;
    mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
      listener = cb;
      return jest.fn();
    });

    try {
      const { findByTestId, rerender } = render(
        <SafeAreaProvider initialMetrics={safeAreaMetrics}>
          <CaptureScreen subscriptionHydrated={false} />
        </SafeAreaProvider>
      );

      await findByTestId('capture-input');
      expect(mirror).not.toHaveBeenCalled();

      await act(async () => {
        listener?.({
          uid: 'firebase-uid-mirror',
          isAnonymous: false,
          providerData: [{ providerId: 'apple.com' }],
        });
      });
      mirror.mockClear();

      await act(async () => {
        rerender(
          <SafeAreaProvider initialMetrics={safeAreaMetrics}>
            <CaptureScreen subscriptionHydrated={true} />
          </SafeAreaProvider>
        );
      });

      expect(mirror).toHaveBeenCalledTimes(1);
    } finally {
      RN.Platform.OS = prevOs;
    }
  });

  it('shows Sync on in header when onAuthStateChanged fires with a non-anonymous user', async () => {
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
    expect(getByText('Sync on')).toBeTruthy();
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
    demoStreamModeState.enabled = false;
    let listener: ((user: unknown) => void) | undefined;
    mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
      listener = cb;
      return jest.fn();
    });

    const { getByTestId, findByTestId } = render(
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

    const headerCta = getByTestId('sync-header-cta');
    expect(headerCta).toBeTruthy();
    // Gradient/shimmer masks duplicate the label string in multiple Text nodes.
    expect(within(headerCta).getAllByText('Enable sync').length).toBeGreaterThan(0);
  });

  it('shows Enable sync in header after restore completes with no signed-in user', async () => {
    demoStreamModeState.enabled = false;
    let listener: ((user: unknown) => void) | undefined;
    mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
      listener = cb;
      return jest.fn();
    });

    const { getByTestId, findByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <CaptureScreen />
      </SafeAreaProvider>
    );

    await findByTestId('capture-input');
    expect(getByTestId('capture-input')).toBeTruthy();

    await act(async () => {
      listener?.(null);
    });

    const headerCta = getByTestId('sync-header-cta');
    expect(headerCta).toBeTruthy();
    expect(within(headerCta).getAllByText('Enable sync').length).toBeGreaterThan(0);
  });

  it('demo stream mode shows Sync on in header while user is still signed out', async () => {
    demoStreamModeState.enabled = true;
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
      listener?.(null);
    });

    expect(getByTestId('sync-header-cta')).toBeTruthy();
    expect(getByText('Sync on')).toBeTruthy();
  });
});
