import { useCallback, useEffect, useRef, useState } from 'react';

import {
  startVoiceCapture,
  stopVoiceCapture,
  subscribeVoiceCapture,
  voiceCaptureSupported,
  type VoiceCapturePhase,
} from './NativeVoiceCapture';

export type UseVoiceCaptureOptions = {
  /** Live transcript while listening (full best string per callback, not deltas). */
  onTranscriptPartial?: (text: string) => void;
  onTranscriptFinal: (text: string, reason: string) => void;
  onError?: (code: string, message?: string) => void;
};

/**
 * Short on-device speech capture (iOS). Subscribes once; safe to pass new callbacks via ref.
 */
export function useVoiceCapture(options: UseVoiceCaptureOptions) {
  const [phase, setPhase] = useState<VoiceCapturePhase>('idle');
  const optionsRef = useRef(options);
  const startInFlightRef = useRef(false);
  const startWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  optionsRef.current = options;

  useEffect(() => {
    const clearStartGuard = () => {
      startInFlightRef.current = false;
      if (startWatchdogRef.current) {
        clearTimeout(startWatchdogRef.current);
        startWatchdogRef.current = null;
      }
    };

    return subscribeVoiceCapture({
      onStateChange: (next) => {
        setPhase(next);
        if (next === 'idle') {
          clearStartGuard();
        }
      },
      onTranscriptPartial: (t) => optionsRef.current.onTranscriptPartial?.(t),
      onTranscriptFinal: (text, reason) => optionsRef.current.onTranscriptFinal(text, reason),
      onError: (code, message) => {
        clearStartGuard();
        optionsRef.current.onError?.(code, message);
        setPhase('idle');
      },
    });
  }, []);

  useEffect(
    () => () => {
      if (startWatchdogRef.current) {
        clearTimeout(startWatchdogRef.current);
        startWatchdogRef.current = null;
      }
    },
    [],
  );

  const start = useCallback(async () => {
    if (!voiceCaptureSupported) return;
    if (phase === 'listening' || startInFlightRef.current) return;

    startInFlightRef.current = true;
    startWatchdogRef.current = setTimeout(() => {
      startInFlightRef.current = false;
      setPhase((current) => (current === 'listening' ? current : 'idle'));
      startWatchdogRef.current = null;
    }, 15000);

    try {
      await startVoiceCapture();
    } catch (error) {
      startInFlightRef.current = false;
      if (startWatchdogRef.current) {
        clearTimeout(startWatchdogRef.current);
        startWatchdogRef.current = null;
      }
      const message = error instanceof Error ? error.message : String(error);
      optionsRef.current.onError?.('start_failed', message);
      setPhase('idle');
    }
  }, [phase]);

  const stop = useCallback(() => {
    stopVoiceCapture();
  }, []);

  return { phase, start, stop, supported: voiceCaptureSupported };
}
