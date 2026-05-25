import { entryIdsWithStemRecurrence, extractEchoStem } from '../echoStems';
import type { Entry } from '../../types/entry';

function entry(id: string, text: string, createdAt: string): Entry {
  return { id, text, createdAt };
}

describe('echoStems', () => {
  it('extractEchoStem returns first content words', () => {
    expect(extractEchoStem('Maybe usefulness comes from transparency')).toBe(
      'maybe usefulness comes',
    );
  });

  it('entryIdsWithStemRecurrence finds entries separated by gap days', () => {
    const entries = [
      entry('a', 'Maybe usefulness comes first', '2026-01-01T10:00:00.000Z'),
      entry('b', 'Maybe usefulness comes again', '2026-02-15T10:00:00.000Z'),
    ];
    const ids = entryIdsWithStemRecurrence(entries, 7, new Date('2026-05-01T10:00:00.000Z'));
    expect(ids.has('a')).toBe(true);
    expect(ids.has('b')).toBe(true);
  });
});
