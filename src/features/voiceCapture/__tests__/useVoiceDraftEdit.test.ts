import { act, renderHook } from '@testing-library/react-native';
import { Keyboard } from 'react-native';

import { useVoiceCapture } from '../useVoiceCapture';
import { useVoiceDraftEdit } from '../useVoiceDraftEdit';

const mockStart = jest.fn();
const mockStop = jest.fn();

jest.mock('../useVoiceCapture', () => ({
  useVoiceCapture: jest.fn((owner: string) => ({
    phase: 'idle',
    start: mockStart,
    stop: mockStop,
    supported: true,
    owner,
  })),
}));

describe('useVoiceDraftEdit', () => {
  beforeEach(() => {
    mockStart.mockClear();
    mockStop.mockClear();
    jest.mocked(useVoiceCapture).mockReturnValue({
      phase: 'idle',
      start: mockStart,
      stop: mockStop,
      supported: true,
    } as ReturnType<typeof useVoiceCapture>);
    jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('starts voice with draft snapshot and dismisses keyboard', () => {
    const setDraft = jest.fn();
    const { result } = renderHook(() =>
      useVoiceDraftEdit({
        draft: 'Existing thought',
        setDraft,
        enabled: true,
      }),
    );

    act(() => {
      result.current.toggleVoice();
    });

    expect(Keyboard.dismiss).toHaveBeenCalled();
    expect(mockStart).toHaveBeenCalled();
  });

  it('stops voice when edit surface is disabled', () => {
    jest.mocked(useVoiceCapture).mockReturnValue({
      phase: 'listening',
      start: mockStart,
      stop: mockStop,
      supported: true,
    });

    renderHook(() =>
      useVoiceDraftEdit({
        draft: 'x',
        setDraft: jest.fn(),
        enabled: false,
      }),
    );

    expect(mockStop).toHaveBeenCalled();
  });
});
