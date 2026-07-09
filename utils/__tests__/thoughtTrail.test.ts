import { buildThoughtTrailNeighbors } from '../thoughtTrail';

describe('buildThoughtTrailNeighbors', () => {
  it('splits keyword neighbors into earlier and later', () => {
    const current = {
      id: 'c',
      text: 'api refactor error handling',
      createdAt: '2026-05-20T10:00:00.000Z',
    };
    const { earlier, later } = buildThoughtTrailNeighbors(current, [
      current,
      {
        id: 'a',
        text: 'api refactor draft',
        createdAt: '2026-05-10T10:00:00.000Z',
      },
      {
        id: 'b',
        text: 'error handling release',
        createdAt: '2026-05-22T10:00:00.000Z',
      },
      {
        id: 'x',
        text: 'lunch',
        createdAt: '2026-05-01T10:00:00.000Z',
      },
    ]);
    expect(earlier.map((e) => e.id)).toEqual(['a']);
    expect(later.map((e) => e.id)).toEqual(['b']);
  });
});
