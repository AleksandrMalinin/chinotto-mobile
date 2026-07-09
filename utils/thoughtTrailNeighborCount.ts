import type { Entry } from '../types/entry';
import { keywordOverlap } from './keywords';

const MIN_OVERLAP = 2;
const MAX_RELATED = 4;

export function thoughtTrailNeighborCount(
  current: Entry,
  all: readonly Entry[],
): number {
  return all
    .filter((other) => other.id !== current.id)
    .filter((other) => keywordOverlap(current.text, other.text) >= MIN_OVERLAP)
    .slice(0, MAX_RELATED)
    .length;
}
