import {
  __resetVoiceCaptureSessionForTests,
  getVoiceCaptureActiveOwner,
  getVoiceCapturePhase,
  registerVoiceCaptureOwner,
  startVoiceCaptureForOwner,
  stopVoiceCaptureForOwner,
} from '../voiceCaptureSession';

const mockStart = jest.fn();
const mockStop = jest.fn();
const mockSubscribe = jest.fn(() => jest.fn());

jest.mock('../NativeVoiceCapture', () => ({
  voiceCaptureSupported: true,
  startVoiceCapture: (...args: unknown[]) => mockStart(...args),
  stopVoiceCapture: () => mockStop(),
  subscribeVoiceCapture: (handlers: {
    onStateChange?: (state: 'idle' | 'listening') => void;
    onTranscriptPartial?: (text: string) => void;
    onTranscriptFinal?: (text: string, reason: string) => void;
    onError?: (code: string, message?: string) => void;
  }) => {
    mockSubscribe(handlers);
    return () => {};
  },
}));

describe('voiceCaptureSession', () => {
  beforeEach(() => {
    __resetVoiceCaptureSessionForTests();
    mockStart.mockReset();
    mockStop.mockReset();
    mockSubscribe.mockClear();
    mockStart.mockResolvedValue(undefined);
  });

  it('routes transcript events only to the active owner', async () => {
    const capturePartial = jest.fn();
    const sheetPartial = jest.fn();

    registerVoiceCaptureOwner('capture', {
      onTranscriptPartial: capturePartial,
      onTranscriptFinal: jest.fn(),
    });
    registerVoiceCaptureOwner('sheet-edit', {
      onTranscriptPartial: sheetPartial,
      onTranscriptFinal: jest.fn(),
    });

    const handlers = mockSubscribe.mock.calls[0][0] as {
      onTranscriptPartial?: (text: string) => void;
    };

    await startVoiceCaptureForOwner('sheet-edit');
    handlers.onTranscriptPartial?.('sheet words');

    expect(sheetPartial).toHaveBeenCalledWith('sheet words');
    expect(capturePartial).not.toHaveBeenCalled();
    expect(getVoiceCaptureActiveOwner()).toBe('sheet-edit');
    expect(getVoiceCapturePhase()).toBe('listening');
  });

  it('lets capture take over an active sheet session', async () => {
    registerVoiceCaptureOwner('capture', {
      onTranscriptFinal: jest.fn(),
    });
    registerVoiceCaptureOwner('sheet-edit', {
      onTranscriptFinal: jest.fn(),
    });

    await startVoiceCaptureForOwner('sheet-edit');
    await startVoiceCaptureForOwner('capture');

    expect(mockStop).toHaveBeenCalled();
    expect(mockStart).toHaveBeenCalledTimes(2);
    expect(getVoiceCaptureActiveOwner()).toBe('capture');
  });

  it('ignores stop requests from non-active owners', () => {
    registerVoiceCaptureOwner('capture', { onTranscriptFinal: jest.fn() });
    registerVoiceCaptureOwner('sheet-edit', { onTranscriptFinal: jest.fn() });

    void startVoiceCaptureForOwner('capture');
    stopVoiceCaptureForOwner('sheet-edit');

    expect(mockStop).not.toHaveBeenCalled();
    expect(getVoiceCaptureActiveOwner()).toBe('capture');
  });
});
