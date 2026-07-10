import {
  NativeEventEmitter,
  NativeModules,
  type EmitterSubscription,
  type NativeModule,
  Platform,
} from 'react-native';

export type VoiceCapturePhase = 'idle' | 'listening';

type VoiceCaptureNativeType = {
  start: (options?: Record<string, unknown>) => Promise<void>;
  stop: () => void;
  /** Present when supported; NativeEventEmitter needs it for `addListener`. */
  addListener?: (eventType: string) => void;
  removeListeners?: (count: number) => void;
};

const NativeVoiceCapture = NativeModules.VoiceCaptureModule as VoiceCaptureNativeType | undefined;

const emitter = NativeVoiceCapture
  ? new NativeEventEmitter(NativeVoiceCapture as unknown as NativeModule)
  : null;

export const voiceCaptureSupported = Platform.OS === 'ios' && NativeVoiceCapture != null;

export type VoiceCaptureStartOptions = {
  locale?: string;
  /** GPT-style: listen until manual stop (default). `false` = legacy ~10s burst + silence auto-stop. */
  continuous?: boolean;
};

export function startVoiceCapture(options?: VoiceCaptureStartOptions) {
  if (!NativeVoiceCapture) {
    return Promise.reject(new Error('Voice capture is not available on this platform.'));
  }
  return NativeVoiceCapture.start({
    continuous: options?.continuous ?? true,
    ...(options?.locale ? { locale: options.locale } : {}),
  });
}

export function stopVoiceCapture() {
  NativeVoiceCapture?.stop();
}

export type VoiceCaptureSubscriptionHandlers = {
  onStateChange?: (state: VoiceCapturePhase) => void;
  onTranscriptPartial?: (text: string) => void;
  onTranscriptFinal?: (text: string, reason: string) => void;
  onError?: (code: string, message?: string) => void;
};

export function subscribeVoiceCapture(handlers: VoiceCaptureSubscriptionHandlers): () => void {
  if (!emitter) {
    return () => {};
  }

  const subs: EmitterSubscription[] = [];

  if (handlers.onStateChange) {
    subs.push(
      emitter.addListener('VoiceCaptureState', (e: { state: unknown }) => {
        const s = e?.state;
        if (s === 'idle' || s === 'listening') {
          handlers.onStateChange?.(s);
        }
      }),
    );
  }

  if (handlers.onTranscriptPartial) {
    subs.push(
      emitter.addListener('VoiceCapturePartial', (e: { text?: string }) => {
        if (typeof e?.text === 'string') {
          handlers.onTranscriptPartial?.(e.text);
        }
      }),
    );
  }

  if (handlers.onTranscriptFinal) {
    subs.push(
      emitter.addListener('VoiceCaptureFinal', (e: { text?: string; reason?: string }) => {
        if (typeof e?.text === 'string' && typeof e?.reason === 'string') {
          handlers.onTranscriptFinal?.(e.text, e.reason);
        }
      }),
    );
  }

  if (handlers.onError) {
    subs.push(
      emitter.addListener('VoiceCaptureError', (e: { code?: string; message?: string }) => {
        if (typeof e?.code === 'string') {
          handlers.onError?.(e.code, typeof e?.message === 'string' ? e.message : undefined);
        }
      }),
    );
  }

  return () => {
    subs.forEach((s) => s.remove());
  };
}
