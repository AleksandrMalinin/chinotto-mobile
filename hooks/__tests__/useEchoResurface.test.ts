import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { useEchoResurface } from '../useEchoResurface';

const mockResolve = jest.fn();
const mockMarkAsShown = jest.fn();
const mockRecordDisplayed = jest.fn();

jest.mock('../../storage/entryEngagementRepository', () => ({
  resolveEchoCandidates: (...args: unknown[]) => mockResolve(...args),
}));

jest.mock('../../storage/resurfaceSession', () => ({
  markAsShown: (...args: unknown[]) => mockMarkAsShown(...args),
}));

jest.mock('../../storage/echoLayerPrefs', () => ({
  recordEchoCandidatesDisplayed: (...args: unknown[]) => mockRecordDisplayed(...args),
  setEchoLastBackgroundAt: jest.fn(),
}));

jest.mock('../../constants/echoLayer', () => ({
  ECHO_LAYER_ACTIVE: true,
  RESURFACE_SHOW_PROBABILITY: 1,
}));

const candidate = {
  id: 'echo-1',
  text: 'Earlier thought',
  createdAt: '2026-05-01T10:00:00.000Z',
  kind: 'temporal' as const,
  reason: 'From last week',
};

const baseOptions = {
  streamDisplayEntries: [
    { id: 'a', text: 'one', createdAt: '2026-05-10T10:00:00.000Z' },
    { id: 'b', text: 'two', createdAt: '2026-05-09T10:00:00.000Z' },
  ],
  preferStreamFallback: false,
  captureReady: true,
  readSheetOpen: false,
  searchActive: false,
  composerHasDraft: false,
  voiceCaptureActive: false,
  entriesEpoch: 2,
};

describe('useEchoResurface', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockResolve.mockReset();
    mockMarkAsShown.mockReset();
    mockRecordDisplayed.mockReset();
    mockResolve.mockResolvedValue([candidate]);
    mockMarkAsShown.mockResolvedValue(undefined);
    mockRecordDisplayed.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('marks shown and sets candidates after the open delay', async () => {
    const { result } = renderHook(() => useEchoResurface(baseOptions));

    await act(async () => {
      jest.advanceTimersByTime(600);
      await Promise.resolve();
    });

    expect(mockResolve).toHaveBeenCalled();
    expect(mockMarkAsShown).toHaveBeenCalledWith('echo-1');
    expect(mockRecordDisplayed).toHaveBeenCalledWith(['echo-1']);
    expect(result.current.echoCandidates).toEqual([candidate]);
  });

  it('retries after foreground like desktop relaunch', async () => {
    let appStateHandler: ((state: string) => void) | undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, handler) => {
      appStateHandler = handler as (state: string) => void;
      return { remove: jest.fn() };
    });

    const { result } = renderHook(() => useEchoResurface(baseOptions));

    await act(async () => {
      jest.advanceTimersByTime(600);
      await Promise.resolve();
    });

    expect(result.current.echoCandidates).toHaveLength(1);
    act(() => {
      result.current.dismissEcho();
    });
    expect(result.current.echoCandidates).toHaveLength(0);

    await act(async () => {
      appStateHandler?.('background');
      appStateHandler?.('active');
      jest.advanceTimersByTime(600);
      await Promise.resolve();
    });

    expect(mockResolve).toHaveBeenCalledTimes(2);
    expect(result.current.echoCandidates).toEqual([candidate]);
  });
});
