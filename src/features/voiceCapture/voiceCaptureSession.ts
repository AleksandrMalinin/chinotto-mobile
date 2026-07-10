import {
  startVoiceCapture,
  stopVoiceCapture,
  subscribeVoiceCapture,
  voiceCaptureSupported,
  type VoiceCapturePhase,
  type VoiceCaptureStartOptions,
} from './NativeVoiceCapture';

export type VoiceCaptureOwner = 'capture' | 'sheet-edit';

type OwnerHandlers = {
  onTranscriptPartial?: (text: string) => void;
  onTranscriptFinal?: (text: string, reason: string) => void;
  onError?: (code: string, message?: string) => void;
};

let phase: VoiceCapturePhase = 'idle';
let activeOwner: VoiceCaptureOwner | null = null;
let startInFlight = false;
let nativeSubscribed = false;

const ownerHandlers = new Map<VoiceCaptureOwner, OwnerHandlers>();
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function setPhase(next: VoiceCapturePhase) {
  if (phase === next) {
    return;
  }
  phase = next;
  if (next === 'idle') {
    activeOwner = null;
    startInFlight = false;
  }
  emitChange();
}

function setActiveOwner(owner: VoiceCaptureOwner | null) {
  if (activeOwner === owner) {
    return;
  }
  activeOwner = owner;
  emitChange();
}

function ensureNativeSubscription() {
  if (nativeSubscribed) {
    return;
  }
  nativeSubscribed = true;
  subscribeVoiceCapture({
    onStateChange: (next) => {
      setPhase(next);
    },
    onTranscriptPartial: (text) => {
      if (!activeOwner) {
        return;
      }
      ownerHandlers.get(activeOwner)?.onTranscriptPartial?.(text);
    },
    onTranscriptFinal: (text, reason) => {
      if (!activeOwner) {
        return;
      }
      ownerHandlers.get(activeOwner)?.onTranscriptFinal?.(text, reason);
    },
    onError: (code, message) => {
      if (!activeOwner) {
        return;
      }
      ownerHandlers.get(activeOwner)?.onError?.(code, message);
      setPhase('idle');
    },
  });
}

function waitForIdle(timeoutMs = 800): Promise<void> {
  if (phase === 'idle') {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      unsubscribe();
      resolve();
    }, timeoutMs);
    const unsubscribe = subscribe(() => {
      if (phase === 'idle') {
        clearTimeout(timer);
        unsubscribe();
        resolve();
      }
    });
  });
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getVoiceCapturePhase(): VoiceCapturePhase {
  return phase;
}

export function getVoiceCaptureActiveOwner(): VoiceCaptureOwner | null {
  return activeOwner;
}

export function registerVoiceCaptureOwner(owner: VoiceCaptureOwner, handlers: OwnerHandlers): () => void {
  ensureNativeSubscription();
  ownerHandlers.set(owner, handlers);
  return () => {
    ownerHandlers.delete(owner);
    if (activeOwner === owner && phase === 'listening') {
      void stopVoiceCaptureForOwner(owner);
    }
  };
}

export async function startVoiceCaptureForOwner(
  owner: VoiceCaptureOwner,
  options?: VoiceCaptureStartOptions,
): Promise<void> {
  if (!voiceCaptureSupported) {
    return;
  }
  if (activeOwner === owner && phase === 'listening') {
    return;
  }
  if (startInFlight) {
    return;
  }

  startInFlight = true;
  try {
    if (phase === 'listening') {
      stopVoiceCapture();
      await waitForIdle();
    }
    setActiveOwner(owner);
    await startVoiceCapture(options);
    setPhase('listening');
  } catch (error) {
    if (activeOwner === owner) {
      setActiveOwner(null);
    }
    setPhase('idle');
    throw error;
  } finally {
    startInFlight = false;
  }
}

export function stopVoiceCaptureForOwner(owner: VoiceCaptureOwner): void {
  if (activeOwner !== owner) {
    return;
  }
  stopVoiceCapture();
}

/** Test-only reset — not exported from public API in production use. */
export function __resetVoiceCaptureSessionForTests() {
  phase = 'idle';
  activeOwner = null;
  startInFlight = false;
  ownerHandlers.clear();
  listeners.clear();
  nativeSubscribed = false;
}
