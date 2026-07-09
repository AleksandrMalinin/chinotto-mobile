import type { Entry } from '../types/entry';
import { buildThreadPeelNeighbors } from '../streamThreadPeel';

describe('buildThreadPeelNeighbors', () => {
  const anchor: Entry = {
    id: 'a',
    text: 'api refactor auth tokens deploy',
    createdAt: '2026-06-10T10:00:00.000Z',
  };
  const earlier: Entry = {
    id: 'b',
    text: 'auth tokens refresh flow',
    createdAt: '2026-06-08T10:00:00.000Z',
  };
  const later: Entry = {
    id: 'c',
    text: 'deploy pipeline api staging',
    createdAt: '2026-06-12T10:00:00.000Z',
  };
  const unrelated: Entry = {
    id: 'd',
    text: 'grocery list milk eggs',
    createdAt: '2026-06-09T10:00:00.000Z',
  };

  it('returns keyword-related neighbors up to max', () => {
    const neighbors = buildThreadPeelNeighbors(anchor, [anchor, earlier, later, unrelated]);
    expect(neighbors.map((e) => e.id)).toEqual(['b', 'c']);
  });

  it('returns empty when no overlap', () => {
    expect(buildThreadPeelNeighbors(anchor, [anchor, unrelated])).toEqual([]);
  });
});
