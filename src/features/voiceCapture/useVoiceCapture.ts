import { useCallback, useEffect, useRef, useState } from 'react';

import {
  startVoiceCapture,
  stopVoiceCapture,
  subscribeVoiceCapture,
  voiceCaptureSupported,
  type VoiceCapturePhase,
} from './NativeVoiceCapture';

export type UseVoiceCaptureOptions = {
  /** MVP: omit to avoid live reflow; V2: update input from partials. */
  onTranscriptPartial?: (text: string) => void;
  onTranscriptFinal: (text: string, reason: string) => void;
};

/**
 * Short on-device speech capture (iOS). Subscribes once; safe to pass new callbacks via ref.
 */
export function useVoiceCapture(options: UseVoiceCaptureOptions) {
  const [phase, setPhase] = useState<VoiceCapturePhase>('idle');
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    return subscribeVoiceCapture({
      onStateChange: setPhase,
      onTranscriptPartial: (t) => optionsRef.current.onTranscriptPartial?.(t),
      onTranscriptFinal: (text, reason) => optionsRef.current.onTranscriptFinal(text, reason),
      onError: () => setPhase('idle'),
    });
  }, []);

  const start = useCallback(async () => {
    if (!voiceCaptureSupported) return;
    if (phase === 'listening') return;
    setPhase('listening');
    try {
      await startVoiceCapture();
    } catch {
      setPhase('idle');
    }
  }, [phase]);

  const stop = useCallback(() => {
    stopVoiceCapture();
  }, []);

  return { phase, start, stop, supported: voiceCaptureSupported };
}
