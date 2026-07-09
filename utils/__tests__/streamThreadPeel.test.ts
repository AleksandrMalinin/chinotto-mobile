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

  it('returns the temporally closest related neighbor', () => {
    const neighbors = buildThreadPeelNeighbors(anchor, [anchor, earlier, later, unrelated]);
    expect(neighbors).toHaveLength(1);
    expect(neighbors[0]!.id).toBe('c');
  });

  it('returns empty when no overlap', () => {
    expect(buildThreadPeelNeighbors(anchor, [anchor, unrelated])).toEqual([]);
  });

  it('prefers a same-day prefix sibling over a distant one', () => {
    const aiAnchor: Entry = {
      id: 'c',
      text: 'AI: test 2',
      createdAt: '2026-07-09T14:00:00.000Z',
    };
    const neighbors = buildThreadPeelNeighbors(aiAnchor, [
      aiAnchor,
      {
        id: 'near',
        text: 'AI: test',
        createdAt: '2026-07-09T10:00:00.000Z',
      },
      {
        id: 'far',
        text: 'AI: cognitive & trust debt',
        createdAt: '2026-04-26T10:00:00.000Z',
      },
    ]);
    expect(neighbors.map((entry) => entry.id)).toEqual(['near']);
  });

  it('returns empty when only the capture prefix overlaps', () => {
    const aiAnchor: Entry = {
      id: 'c',
      text: 'AI: test',
      createdAt: '2026-06-10T10:00:00.000Z',
    };
    const neighbors = buildThreadPeelNeighbors(aiAnchor, [
      aiAnchor,
      {
        id: 'b',
        text: 'AI: complexity',
        createdAt: '2026-06-10T11:00:00.000Z',
      },
    ]);
    expect(neighbors).toEqual([]);
  });
});
