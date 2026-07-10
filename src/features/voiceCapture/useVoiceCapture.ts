import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

import { voiceCaptureSupported } from './NativeVoiceCapture';
import {
  getVoiceCaptureActiveOwner,
  getVoiceCapturePhase,
  registerVoiceCaptureOwner,
  startVoiceCaptureForOwner,
  stopVoiceCaptureForOwner,
  subscribe,
  type VoiceCaptureOwner,
} from './voiceCaptureSession';

export type UseVoiceCaptureOptions = {
  /** Live transcript while listening (full best string per callback, not deltas). */
  onTranscriptPartial?: (text: string) => void;
  onTranscriptFinal: (text: string, reason: string) => void;
  onError?: (code: string, message?: string) => void;
};

function selectPhaseForOwner(owner: VoiceCaptureOwner): 'idle' | 'listening' {
  if (getVoiceCaptureActiveOwner() !== owner) {
    return 'idle';
  }
  return getVoiceCapturePhase();
}

/**
 * Short on-device speech capture (iOS). One native session; events route to the active owner only.
 */
export function useVoiceCapture(owner: VoiceCaptureOwner, options: UseVoiceCaptureOptions) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const phase = useSyncExternalStore(
    subscribe,
    () => selectPhaseForOwner(owner),
    () => selectPhaseForOwner(owner),
  );

  useEffect(() => {
    return registerVoiceCaptureOwner(owner, {
      onTranscriptPartial: (text) => optionsRef.current.onTranscriptPartial?.(text),
      onTranscriptFinal: (text, reason) => optionsRef.current.onTranscriptFinal(text, reason),
      onError: (code, message) => optionsRef.current.onError?.(code, message),
    });
  }, [owner]);

  const start = useCallback(async () => {
    try {
      await startVoiceCaptureForOwner(owner, { continuous: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      optionsRef.current.onError?.('start_failed', message);
    }
  }, [owner]);

  const stop = useCallback(() => {
    stopVoiceCaptureForOwner(owner);
  }, [owner]);

  return { phase, start, stop, supported: voiceCaptureSupported };
}
