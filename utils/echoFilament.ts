import { ECHO_FILAMENT_MAX_STATIONS } from '../constants/echoLayer';
import { extractEchoStem } from './echoStems';
import type { EchoCandidate } from './selectEchoCandidates';

const MS_PER_HOUR = 3_600_000;

function hoursBetween(aIso: string, bIso: string): number {
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.abs(a - b) / MS_PER_HOUR;
}

/** Silent link strength — shared stem or capture within 48h. */
export function filamentLinkScore(from: EchoCandidate, to: EchoCandidate): number {
  const hours = hoursBetween(from.createdAt, to.createdAt);
  let score = 0;
  if (hours <= 48) {
    score += Math.max(0, 32 - hours);
  }
  const stemA = extractEchoStem(from.text);
  const stemB = extractEchoStem(to.text);
  if (stemA != null && stemA === stemB) {
    score += 42;
  }
  return score;
}

/**
 * Orders echo candidates into a short continuity thread (not labeled as topics).
 * Starts from the primary (index 0) and greedily chains by link score.
 */
export function buildEchoFilamentStations(
  candidates: readonly EchoCandidate[],
  maxStations: number = ECHO_FILAMENT_MAX_STATIONS,
): EchoCandidate[] {
  if (candidates.length === 0 || maxStations <= 0) {
    return [];
  }

  const used = new Set<string>();
  const out: EchoCandidate[] = [candidates[0]!];
  used.add(candidates[0]!.id);

  while (out.length < maxStations) {
    const tail = out[out.length - 1]!;
    let best: EchoCandidate | null = null;
    let bestScore = 0;

    for (const candidate of candidates) {
      if (used.has(candidate.id)) {
        continue;
      }
      const score = filamentLinkScore(tail, candidate);
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }

    if (best == null || bestScore <= 0) {
      break;
    }
    out.push(best);
    used.add(best.id);
  }

  return out;
}
