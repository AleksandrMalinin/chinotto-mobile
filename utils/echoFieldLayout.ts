import { ECHO_FIELD_MAX_NODES } from '../constants/echoLayer';
import type { EchoCandidate } from './selectEchoCandidates';

/** Card width used for ring spacing math (keep in sync with EchoFieldVessel). */
export const ECHO_FIELD_NODE_WIDTH = 128;

export type EchoFieldNode = EchoCandidate & {
  /** Offset from viewport center, normalized ~±0.72. */
  ox: number;
  oy: number;
  /** Visual weight — gravity pulls inward. */
  mass: number;
};

/** Even ring radius so card centers stay ~one card width apart. */
export function echoFieldRingRadiusNorm(satelliteCount: number): number {
  if (satelliteCount <= 0) {
    return 0;
  }
  if (satelliteCount === 1) {
    return 0.44;
  }
  if (satelliteCount === 2) {
    return 0.5;
  }
  if (satelliteCount === 3) {
    return 0.54;
  }
  return 0.58;
}

/**
 * Deterministic ring — primary at center, satellites evenly spaced.
 */
export function layoutEchoFieldNodes(
  candidates: readonly EchoCandidate[],
  maxNodes: number = ECHO_FIELD_MAX_NODES,
): EchoFieldNode[] {
  const pool = candidates.slice(0, maxNodes);
  if (pool.length === 0) {
    return [];
  }

  const satelliteCount = pool.length - 1;
  const ringR = echoFieldRingRadiusNorm(satelliteCount);

  return pool.map((entry, index) => {
    if (index === 0) {
      return {
        ...entry,
        ox: 0,
        oy: 0,
        mass: entry.kind === 'gravity' ? 1 : 0.72,
      };
    }

    const slot = index - 1;
    const angle = -Math.PI / 2 + (slot * 2 * Math.PI) / satelliteCount;
    const isGravity = entry.kind === 'gravity';
    const r = isGravity ? ringR * 0.82 : ringR;
    const mass = isGravity ? 0.8 : 0.45 + (slot % 3) * 0.08;

    return {
      ...entry,
      ox: Math.cos(angle) * r,
      oy: Math.sin(angle) * r * 0.88,
      mass,
    };
  });
}

/** Map normalized offset to pixels for a given viewport. */
export function echoFieldSpanPx(viewportW: number, viewportH: number): number {
  const w = Math.max(viewportW, 1);
  const h = Math.max(viewportH, 1);
  return Math.min(w, h) * 0.5;
}
