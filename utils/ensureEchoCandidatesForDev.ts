import type { Entry } from '../types/entry';
import type { EchoCandidate } from './selectEchoCandidates';

/** Guarantees at least one echo row in `__DEV__` so the layer can mount for dogfood. */
export function ensureEchoCandidatesForDev(
  candidates: readonly EchoCandidate[],
  streamEntries: readonly Entry[],
): EchoCandidate[] {
  if (candidates.length > 0) {
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
