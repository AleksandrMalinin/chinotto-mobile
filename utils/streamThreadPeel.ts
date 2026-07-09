import type { Entry } from '../types/entry';
import { STREAM_THREAD_PEEL_MAX_NEIGHBORS } from '../constants/streamThreadPeel';
import { relatedThoughtTrailEntries } from './thoughtTrail';

function parseMs(iso: string): number {
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

/** Closest related entry for stream peel — not a mini-feed across months. */
export function buildThreadPeelNeighbors(
  anchor: Entry,
  all: readonly Entry[],
): Entry[] {
  const anchorMs = parseMs(anchor.createdAt);
  const related = relatedThoughtTrailEntries(anchor, all, STREAM_THREAD_PEEL_MAX_NEIGHBORS * 6);
  return related
    .sort((a, b) => {
      const distA = Math.abs(parseMs(a.createdAt) - anchorMs);
      const distB = Math.abs(parseMs(b.createdAt) - anchorMs);
      if (distA !== distB) {
        return distA - distB;
      }
      return b.createdAt.localeCompare(a.createdAt);
    })
    .slice(0, STREAM_THREAD_PEEL_MAX_NEIGHBORS);
}
