import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import * as entryRepository from '../../storage/entryRepository';
import * as firebaseAuthModule from '../../sync/firebaseAuth';
import * as firebaseConfig from '../../sync/firebaseConfig';

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
});

describe('CaptureScreen sync auth restore', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.mocked(firebaseConfig.isFirebaseSyncConfigured).mockReturnValue(true);
    jest.mocked(firebaseAuthModule.getOrInitAuth).mockReturnValue({ currentUser: null } as never);
    mockOnAuthStateChanged.mockReset();
    mockOnAuthStateChanged.mockImplementation(() => jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not show Enable sync while auth is restoring (before first onAuthStateChanged)', async () => {
    mockOnAuthStateChanged.mockImplementation(() => jest.fn());

    const { queryByTestId, findByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <CaptureScreen />
      </SafeAreaProvider>
    );

    await findByTestId('capture-input');
    expect(queryByTestId('enable-sync-cta')).toBeNull();
  });

  it('does not show Enable sync when onAuthStateChanged fires with a non-anonymous user', async () => {
    let listener: ((user: unknown) => void) | undefined;
    mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
      listener = cb;
      return jest.fn();
    });

    const { queryByTestId, findByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <CaptureScreen />
      </SafeAreaProvider>
    );

    await findByTestId('capture-input');
    expect(queryByTestId('enable-sync-cta')).toBeNull();

    await act(async () => {
      listener?.({
        uid: 'firebase-uid-1',
        isAnonymous: false,
        providerData: [{ providerId: 'apple.com' }],
      });
    });

    expect(queryByTestId('enable-sync-cta')).toBeNull();
  });

  it('shows Enable sync after restore when user is anonymous only', async () => {
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

    expect(getByTestId('enable-sync-cta')).toBeTruthy();
  });

  it('shows Enable sync only after restore completes with no signed-in user', async () => {
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

    expect(getByTestId('enable-sync-cta')).toBeTruthy();
  });
});
