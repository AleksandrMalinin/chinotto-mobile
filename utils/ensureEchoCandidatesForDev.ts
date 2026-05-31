import { ECHO_LAYER_MIN_CANDIDATES } from '../constants/echoLayer';
import type { Entry } from '../types/entry';
import type { EchoCandidate } from './selectEchoCandidates';

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
    return streamEntries.slice(0, 7).map((entry) => ({
      ...entry,
      kind: 'gravity' as const,
    }));
  }
  return [
    {
      id: '__dev_echo_seed__',
      text: 'A thought that still echoes.',
      createdAt: new Date().toISOString(),
      kind: 'gravity',
    },
  ];
}
