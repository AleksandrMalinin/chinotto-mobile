import { ECHO_AI_RERANK_ENABLED } from '../constants/echoLayer';
import type { EchoCandidate } from './selectEchoCandidates';

export type EchoAiRerankContext = {
  /** Dwell seconds on last Echo visit — future pacing input. */
  lastEchoDwellSeconds?: number;
  /** Capture streak — suppress aggressive resurfacing when high. */
  recentCaptureCount?: number;
};

/**
 * Phase B — on-device re-rank hook. Default: passthrough (Phase A deterministic order).
 * Never adds slots, labels, or explanations. Failures must fall back to input order.
 */
export function rerankEchoCandidates(
  candidates: readonly EchoCandidate[],
  _context: EchoAiRerankContext = {},
): EchoCandidate[] {
  if (!ECHO_AI_RERANK_ENABLED || candidates.length <= 1) {
    return [...candidates];
  }
  return [...candidates];
}

export function applyEchoAiPipeline(
  candidates: readonly EchoCandidate[],
  context: EchoAiRerankContext = {},
): EchoCandidate[] {
  try {
    return rerankEchoCandidates(candidates, context);
  } catch {
    return [...candidates];
  }
}
