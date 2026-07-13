import { formatEntryTime, formatOlderSectionLabel } from '../groupEntriesByDate';
import {
  buildThoughtTrailLinkedIds,
  buildThoughtTrailNeighbors,
  capturePrefixKey,
  relativeTrailWhen,
} from '../thoughtTrail';

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

describe('buildThoughtTrailLinkedIds', () => {
  it('marks entries that share enough keywords with any other entry', () => {
    const linked = buildThoughtTrailLinkedIds([
      { id: 'a', text: 'api refactor draft', createdAt: '2026-05-10T10:00:00.000Z' },
      { id: 'b', text: 'api refactor error handling', createdAt: '2026-05-20T10:00:00.000Z' },
      { id: 'x', text: 'lunch plan', createdAt: '2026-05-01T10:00:00.000Z' },
    ]);
    expect(linked.has('a')).toBe(true);
    expect(linked.has('b')).toBe(true);
    expect(linked.has('x')).toBe(false);
  });

  it('does not link capture-prefix siblings without keyword overlap', () => {
    const linked = buildThoughtTrailLinkedIds([
      { id: 'a', text: 'AI: test 2', createdAt: '2026-07-09T12:00:00.000Z' },
      { id: 'b', text: 'AI: complexity', createdAt: '2026-07-09T11:00:00.000Z' },
      { id: 'c', text: 'AI: test', createdAt: '2026-07-09T10:00:00.000Z' },
      {
        id: 'd',
        text: 'AI: cognitive & trust debt',
        createdAt: '2026-04-26T10:00:00.000Z',
      },
    ]);
    expect(linked.has('a')).toBe(true);
    expect(linked.has('c')).toBe(true);
    expect(linked.has('b')).toBe(false);
    expect(linked.has('d')).toBe(false);
  });

  it('includes keyword-related neighbors in trail for sheet thread panel', () => {
    const anchor = {
      id: 'c',
      text: 'AI: test',
      createdAt: '2026-07-09T10:00:00.000Z',
    };
    const { earlier, later } = buildThoughtTrailNeighbors(anchor, [
      anchor,
      { id: 'b', text: 'AI: complexity', createdAt: '2026-07-09T11:00:00.000Z' },
      { id: 'a', text: 'AI: test 2', createdAt: '2026-07-09T12:00:00.000Z' },
    ]);
    expect(earlier.map((row) => row.id)).toEqual([]);
    expect(later.map((row) => row.id)).toEqual(['a']);
  });
});

describe('capturePrefixKey', () => {
  it('normalizes a leading capture stem', () => {
    expect(capturePrefixKey('AI: test')).toBe('ai');
    expect(capturePrefixKey('ASD: was building')).toBe('asd');
  });

  it('ignores urls and bare colons', () => {
    expect(capturePrefixKey('https://example.com')).toBeNull();
    expect(capturePrefixKey('no prefix here')).toBeNull();
  });
});

describe('relativeTrailWhen', () => {
  const anchor = '2026-07-09T14:00:00.000Z';

  it('shows clock time for same-calendar-day neighbors', () => {
    const earlier = '2026-07-09T10:00:00.000Z';
    const later = '2026-07-09T18:00:00.000Z';
    expect(relativeTrailWhen(anchor, earlier)).toBe(formatEntryTime(earlier));
    expect(relativeTrailWhen(anchor, later)).toBe(formatEntryTime(later));
  });

  it('shows a section-style date across calendar days', () => {
    expect(relativeTrailWhen(anchor, '2026-07-08T14:00:00.000Z')).toBe(
      formatOlderSectionLabel('2026-07-08T14:00:00.000Z'),
    );
    expect(relativeTrailWhen(anchor, '2026-04-26T10:00:00.000Z')).toBe(
      formatOlderSectionLabel('2026-04-26T10:00:00.000Z'),
    );
  });
});
