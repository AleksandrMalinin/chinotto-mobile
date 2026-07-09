import type { Entry } from '../types/entry';
import { STREAM_THREAD_PEEL_MAX_NEIGHBORS } from '../constants/streamThreadPeel';
import { buildThoughtTrailNeighbors } from './thoughtTrail';

/** Compact neighbor list for stream row thread peel — earlier first, then later. */
export function buildThreadPeelNeighbors(
  anchor: Entry,
  all: readonly Entry[],
): Entry[] {
  const { earlier, later } = buildThoughtTrailNeighbors(anchor, all);
  const out: Entry[] = [];
  for (const row of earlier) {
    if (out.length >= STREAM_THREAD_PEEL_MAX_NEIGHBORS) {
      break;
    }
    out.push(row);
  }
  for (const row of later) {
    if (out.length >= STREAM_THREAD_PEEL_MAX_NEIGHBORS) {
      break;
    }
    out.push(row);
  }
  return out;
}
