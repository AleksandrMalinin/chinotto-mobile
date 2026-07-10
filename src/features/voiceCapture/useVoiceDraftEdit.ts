import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef } from 'react';
import { Keyboard } from 'react-native';

import { mergeVoiceTranscript } from './mergeVoiceTranscript';
import { useVoiceCapture, type UseVoiceCaptureOptions } from './useVoiceCapture';

export type UseVoiceDraftEditOptions = {
  draft: string;
  setDraft: (text: string) => void;
  /** When false, voice controls stay hidden and active sessions stop. */
  enabled: boolean;
  hapticsEnabled?: boolean;
  onError?: UseVoiceCaptureOptions['onError'];
};

/**
 * Append-mode voice dictation into an editable draft (sheet edit, etc.).
 * Snapshot draft at mic start; partial/final speech merges onto that base.
 */
export function useVoiceDraftEdit({
  draft,
  setDraft,
  enabled,
  hapticsEnabled = true,
  onError,
}: UseVoiceDraftEditOptions) {
  const baseRef = useRef('');

  const onTranscriptPartial = useCallback(
    (partial: string) => {
      setDraft(mergeVoiceTranscript(baseRef.current, partial));
    },
    [setDraft],
  );

  const onTranscriptFinal = useCallback(
    (spoken: string) => {
      setDraft(mergeVoiceTranscript(baseRef.current, spoken));
      if (hapticsEnabled) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [hapticsEnabled, setDraft],
  );

  const { phase, start, stop, supported } = useVoiceCapture('sheet-edit', {
    onTranscriptPartial: onTranscriptPartial,
    onTranscriptFinal: onTranscriptFinal,
    onError,
  });

  useEffect(() => {
    if (!enabled && phase === 'listening') {
      stop();
    }
  }, [enabled, phase, stop]);

  const toggleVoice = useCallback(() => {
    if (!supported || !enabled) {
      return;
    }
    if (phase === 'listening') {
      stop();
      return;
    }
    Keyboard.dismiss();
    baseRef.current = draft;
    void start();
  }, [draft, enabled, phase, start, stop, supported]);

  return {
    phase,
    supported: supported && enabled,
    toggleVoice,
    stopVoice: stop,
  };
}
