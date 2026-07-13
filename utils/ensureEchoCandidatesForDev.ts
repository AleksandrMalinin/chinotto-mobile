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
  suppressedIds?: ReadonlySet<string>,
): EchoCandidate[] {
  const isSuppressed = (id: string) => suppressedIds?.has(id) ?? false;
  const filtered = candidates.filter((candidate) => !isSuppressed(candidate.id));

  if (filtered.length >= ECHO_LAYER_MIN_CANDIDATES) {
    return [...filtered];
  }
  if (filtered.length > 0 && (!__DEV__ || process.env.NODE_ENV === 'test')) {
    return [...filtered];
  }
  if (!__DEV__ || process.env.NODE_ENV === 'test') {
    return [];
  }
  if (streamEntries.length > 0) {
    const injected = devEchoCandidateOutsideRecentStream(streamEntries);
    if (isSuppressed(injected.id)) {
      return [...filtered];
    }
    return [...filtered, injected];
  }
  const seed = { ...DEV_ECHO_SEED, createdAt: new Date().toISOString() };
  if (isSuppressed(seed.id)) {
    return [...filtered];
  }
  return [...filtered, seed];
}
