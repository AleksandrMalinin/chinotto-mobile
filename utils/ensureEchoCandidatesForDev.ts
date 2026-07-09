import { ECHO_LAYER_MIN_CANDIDATES } from '../constants/echoLayer';
import type { Entry } from '../types/entry';
import { HOME_DEPTH_RECENT_STREAM_WINDOW } from './homeDepthRecallVisibility';
import type { EchoCandidate } from './selectEchoCandidates';

const DEV_ECHO_SEED: EchoCandidate = {
  id: '__dev_echo_seed__',
  text: 'A thought that still echoes.',
  createdAt: new Date().toISOString(),
  kind: 'temporal',
  reason: 'From yesterday',
};

function devEchoCandidateOutsideRecentStream(
  streamEntries: readonly Entry[],
): EchoCandidate {
  const outsideRecent = streamEntries[HOME_DEPTH_RECENT_STREAM_WINDOW];
  if (outsideRecent) {
    return {
      ...outsideRecent,
      kind: 'temporal',
      reason: 'From last week',
    };
  }
  return { ...DEV_ECHO_SEED, createdAt: new Date().toISOString() };
}

/** Guarantees echo rows in `__DEV__` so the layer can mount for dogfood. */
export function ensureEchoCandidatesForDev(
  candidates: readonly EchoCandidate[],
  streamEntries: readonly Entry[],
): EchoCandidate[] {
  if (candidates.length >= ECHO_LAYER_MIN_CANDIDATES) {
    return [...candidates];
  }
  if (candidates.length > 0 && (!__DEV__ || process.env.NODE_ENV === 'test')) {
    return [...candidates];
  }
  if (!__DEV__ || process.env.NODE_ENV === 'test') {
    return [];
  }
  if (streamEntries.length > 0) {
    return [devEchoCandidateOutsideRecentStream(streamEntries)];
  }
  return [{ ...DEV_ECHO_SEED, createdAt: new Date().toISOString() }];
}
