describe('NativeVoiceCapture', () => {
  afterEach(() => {
    jest.resetModules();
  });

  it('reports unsupported off iOS or without native module', () => {
    jest.doMock('react-native', () => ({
      NativeModules: {},
      NativeEventEmitter: jest.fn(),
      Platform: { OS: 'android' },
    }));
    const { voiceCaptureSupported } = require('../NativeVoiceCapture') as typeof import('../NativeVoiceCapture');
    expect(voiceCaptureSupported).toBe(false);
  });

  it('starts continuous voice capture by default', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    jest.doMock('react-native', () => ({
      NativeModules: { VoiceCaptureModule: { start } },
      NativeEventEmitter: jest.fn(),
      Platform: { OS: 'ios' },
    }));
    const { startVoiceCapture } = require('../NativeVoiceCapture') as typeof import('../NativeVoiceCapture');

    await startVoiceCapture();

    expect(start).toHaveBeenCalledWith({ continuous: true });
  });

  it('passes locale and burst mode when requested', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    jest.doMock('react-native', () => ({
      NativeModules: { VoiceCaptureModule: { start } },
      NativeEventEmitter: jest.fn(),
      Platform: { OS: 'ios' },
    }));
    const { startVoiceCapture } = require('../NativeVoiceCapture') as typeof import('../NativeVoiceCapture');

    await startVoiceCapture({ continuous: false, locale: 'en-US' });

    expect(start).toHaveBeenCalledWith({ continuous: false, locale: 'en-US' });
  });
});
